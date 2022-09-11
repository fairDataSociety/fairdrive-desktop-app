package fuse

import (
	"bufio"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/datafund/fdfs/pkg/api"
	"github.com/fairdatasociety/fairOS-dfs/pkg/logging"
	"github.com/sirupsen/logrus"
	"github.com/winfsp/cgofuse/fuse"
)

type node_t struct {
	id      string
	stat    fuse.Stat_t
	xatr    map[string][]byte
	chldrn  []string
	data    []byte
	opencnt int
}

func newNode(id string, dev uint64, ino uint64, mode uint32, uid uint32, gid uint32) *node_t {
	tmsp := fuse.Now()
	self := node_t{
		id: id,
		stat: fuse.Stat_t{
			Dev:      dev,
			Ino:      ino,
			Mode:     mode,
			Nlink:    1,
			Uid:      uid,
			Gid:      gid,
			Atim:     tmsp,
			Mtim:     tmsp,
			Ctim:     tmsp,
			Birthtim: tmsp,
			Flags:    0,
		},
		xatr:    nil,
		opencnt: 0,
	}
	if fuse.S_IFDIR == self.stat.Mode&fuse.S_IFMT {
		self.chldrn = []string{}
	}
	return &self
}

func (f *node_t) isDir() bool {
	if f.stat.Mode&fuse.S_IFDIR > 0 {
		return true
	}
	return false
}

type Ffdfs struct {
	fuse.FileSystemBase
	lock    sync.Mutex
	log     logging.Logger
	api     *api.DfsAPI
	ino     uint64
	root    *node_t
	openmap map[uint64]*node_t
}

func New(username, password, pod string, logLevel logrus.Level, fc *api.FairOSConfig) (*Ffdfs, error) {
	logger := logging.New(os.Stdout, logLevel)
	apiLogger := logging.New(os.Stdout, 3)
	dfsApi, err := api.New(apiLogger, username, password, pod, fc)
	if err != nil {
		return nil, err
	}
	return &Ffdfs{
		log: logger,
		api: dfsApi,
	}, nil
}

// Getattr gets file attributes.
func (f *Ffdfs) Getattr(path string, stat *fuse.Stat_t, fh uint64) (errc int) {
	node := f.getNode(path, fh)
	if nil == node {
		return -fuse.ENOENT
	}
	*stat = node.stat
	return 0
}

// Readdir reads a directory.
func (f *Ffdfs) Readdir(path string,
	fill func(
		name string,
		stat *fuse.Stat_t,
		ofst int64) bool,
	ofst int64,
	fh uint64) (errc int) {
	defer f.synchronize()()
	node := f.getNode(path, fh)
	if nil == node {
		return -fuse.ENOENT
	}

	fill(".", &node.stat, 0)
	fill("..", nil, 0)
	for _, chld := range node.chldrn {
		nd := f.lookupNode(filepath.Join(path, chld))
		if nd != nil && !fill(chld, &nd.stat, 0) {
			break
		}
	}
	return 0
}

// Read reads data from a file.
func (f *Ffdfs) Read(path string, buff []byte, ofst int64, fh uint64) (n int) {
	r, _, err := f.api.DownloadFile(f.api.Pod.GetPodName(), path, f.api.DfsSessionId)
	if err != nil {
		f.log.Errorf("read: download failed %s: %s", path, err.Error())
		return -fuse.EIO
	}

	b := bufio.NewReader(r)
	dataSize := b.Size()
	discarded, err := b.Discard(int(ofst - 1))
	if int64(discarded) != ofst-1 {
		f.log.Errorf("read: reader discard failed %s: %s", path, err.Error())
		return -fuse.EIO
	}

	endofst := ofst + int64(len(buff))
	if endofst > int64(dataSize) {
		endofst = int64(dataSize)
	}

	if endofst < ofst {
		return 0
	}
	n, err = b.Read(buff)
	if err != nil {
		f.log.Errorf("read: read failed %s: %s", path, err.Error())
		return -fuse.EIO
	}
	return
}

func (f *Ffdfs) getNode(path string, fh uint64) *node_t {
	node, found := f.openmap[fh]
	if found {
		return node
	}
	nd := f.lookupNode(path)
	if nd != nil && ^uint64(0) != fh {
		f.openmap[fh] = nd
		f.log.Debugf("opened file %s %d", path, fh)
	}
	return nd
}

func (f *Ffdfs) openNode(path string, dir bool) (int, uint64) {
	node := f.lookupNode(path)
	if nil == node {
		return -fuse.ENOENT, ^uint64(0)
	}
	if !dir && fuse.S_IFDIR == node.stat.Mode&fuse.S_IFMT {
		f.log.Errorf("failed opening node %s is a dir", path)
		return -fuse.EISDIR, ^uint64(0)
	}
	if dir && fuse.S_IFDIR != node.stat.Mode&fuse.S_IFMT {
		f.log.Errorf("failed opening node %s is not a dir", path)
		return -fuse.ENOTDIR, ^uint64(0)
	}
	node.opencnt++
	if 1 == node.opencnt {
		f.openmap[node.stat.Ino] = node
	}
	return 0, node.stat.Ino
}

func (f *Ffdfs) closeNode(fh uint64) int {
	node := f.openmap[fh]
	node.opencnt--
	if 0 == node.opencnt {
		err := node.Close()
		if err != nil {
			return -fuse.EIO
		}
		delete(f.openmap, node.stat.Ino)
	}
	return 0
}

func (f *node_t) Close() error {
	return nil
}

//func (f *Ffdfs) Opendir(path string) (errc int, fh uint64) {
//	defer f.synchronize()()
//
//	return f.openNode(path, true)
//}

func (f *Ffdfs) Open(path string, flags int) (errc int, fh uint64) {
	defer f.synchronize()()

	return f.openNode(path, false)
}

func (f *Ffdfs) synchronize() func() {
	f.lock.Lock()
	return func() {
		f.lock.Unlock()
	}
}

//lookupNode will get metadata from fairos
func (f *Ffdfs) lookupNode(path string) (node *node_t) {
	fStat, err := f.api.FileStat(f.api.Pod.GetPodName(), path, f.api.DfsSessionId)
	if err != nil {
		dirInode, err := f.api.Inode(path)
		if err != nil {
			f.log.Warningf("lookup failed for %s: %s\n", path, err.Error())
			return
		}
		fileOrDirNames := []string{}
		for _, fileOrDirName := range dirInode.FileOrDirNames {
			if strings.HasPrefix(fileOrDirName, "_D_") {
				dirName := strings.TrimPrefix(fileOrDirName, "_D_")
				fileOrDirNames = append(fileOrDirNames, dirName)
			} else if strings.HasPrefix(fileOrDirName, "_F_") {
				fileName := strings.TrimPrefix(fileOrDirName, "_F_")
				fileOrDirNames = append(fileOrDirNames, fileName)
			}
		}
		f.ino++
		node = &node_t{
			id: path,
			stat: fuse.Stat_t{
				Ino:      f.ino,
				Mode:     fuse.S_IFDIR | 0777,
				Nlink:    1,
				Atim:     fuse.NewTimespec(time.Unix(dirInode.Meta.AccessTime, 0)),
				Mtim:     fuse.NewTimespec(time.Unix(dirInode.Meta.ModificationTime, 0)),
				Birthtim: fuse.NewTimespec(time.Unix(dirInode.Meta.CreationTime, 0)),
				Flags:    0,
			},
			xatr:    nil,
			chldrn:  fileOrDirNames,
			opencnt: 0,
		}
		return
	}
	accTime, err := strconv.ParseInt(fStat.AccessTime, 10, 64)
	if err != nil {
		f.log.Warningf("lookup failed for %s: %s\n", path, err.Error())
		return
	}
	modTime, err := strconv.ParseInt(fStat.ModificationTime, 10, 64)
	if err != nil {
		f.log.Warningf("lookup failed for %s: %s\n", path, err.Error())
		return
	}
	creationTime, err := strconv.ParseInt(fStat.ModificationTime, 10, 64)
	if err != nil {
		f.log.Warningf("lookup failed for %s: %s\n", path, err.Error())
		return
	}
	f.ino++
	node = &node_t{
		id: path,
		stat: fuse.Stat_t{
			Ino:      f.ino,
			Mode:     fuse.S_IFREG | 0444,
			Nlink:    1,
			Atim:     fuse.NewTimespec(time.Unix(accTime, 0)),
			Mtim:     fuse.NewTimespec(time.Unix(modTime, 0)),
			Birthtim: fuse.NewTimespec(time.Unix(creationTime, 0)),
			Flags:    0,
		},
		xatr:    nil,
		opencnt: 0,
	}
	node.stat.Size, _ = strconv.ParseInt(fStat.FileSize, 10, 64)
	return
}
