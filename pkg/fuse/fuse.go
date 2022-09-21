package fuse

import (
	"bytes"
	"io"
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

const (
	blockSize = 65536
)

type ops struct {
	start int64
	end   int64
	buf   []byte
	tmsp  int64
}

type node_t struct {
	id             string
	stat           fuse.Stat_t
	xatr           map[string][]byte
	chldrn         []string
	opencnt        int
	writesInFlight []*ops
	readsInFlight  io.ReadSeekCloser
}

func (n *node_t) enqueueWriteOp(op *ops) {
	if n.writesInFlight == nil {
		n.writesInFlight = make([]*ops, 0)
	}

	idx := 0
	for ; idx < len(n.writesInFlight); idx++ {
		if n.writesInFlight[idx].start > op.start {
			break
		}
	}
	switch {
	case idx == 0:
		n.writesInFlight = append([]*ops{op}, n.writesInFlight...)
	case idx == len(n.writesInFlight):
		n.writesInFlight = append(n.writesInFlight, op)
	default:
		n.writesInFlight = append(n.writesInFlight[:idx], append([]*ops{op}, n.writesInFlight[idx:]...)...)
	}
	n.writesInFlight = merge(n.writesInFlight)
}

func merge(writeOps []*ops) (merged []*ops) {
	for _, op := range writeOps {
		if len(merged) == 0 || merged[len(merged)-1].end < op.start {
			// No overlap
			merged = append(merged, op)
		} else {
			prev := merged[len(merged)-1]
			if op.end > prev.end {
				old := prev.end
				prev.end = op.end
				prev.buf = append(prev.buf, make([]byte, prev.end-old)...)
				var idxSrc, idxDst, tmsp int64
				if op.tmsp > prev.tmsp {
					idxDst = op.start - prev.start
					tmsp = op.tmsp
				} else {
					idxDst = old - prev.start
					idxSrc = old - op.start
					tmsp = prev.tmsp
				}
				copy(prev.buf[idxDst:], op.buf[idxSrc:])
				prev.tmsp = tmsp
			} else {
				if op.tmsp > prev.tmsp {
					start := op.start - prev.start
					end := start + (op.end - op.start)
					copy(prev.buf[start:end], op.buf)
					prev.tmsp = op.tmsp
				}
			}
		}
	}
	return merged
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

func (n *node_t) isDir() bool {
	return n.stat.Mode&fuse.S_IFDIR > 0
}

type Ffdfs struct {
	fuse.FileSystemBase
	lock    sync.Mutex
	log     logging.Logger
	api     *api.DfsAPI
	ino     uint64
	openmap map[uint64]*node_t
}

func New(username, password, pod string, logLevel logrus.Level, fc *api.FairOSConfig) (*Ffdfs, error) {
	logger := logging.New(os.Stdout, logLevel)
	apiLogger := logging.New(os.Stdout, 3)
	dfsApi, err := api.New(apiLogger, username, password, pod, fc)
	if err != nil {
		return nil, err
	}
	f := &Ffdfs{
		log: logger,
		api: dfsApi,
	}
	f.openmap = map[uint64]*node_t{}
	return f, nil
}

func (f *Ffdfs) Utimens(path string, tmsp []fuse.Timespec) (errc int) {
	defer f.synchronize()()

	node := f.lookupNode(path)
	if nil == node {
		return -fuse.ENOENT
	}
	defer node.Close()

	node.stat.Ctim = fuse.Now()
	if nil == tmsp {
		tmsp0 := node.stat.Ctim
		tmsa := [2]fuse.Timespec{tmsp0, tmsp0}
		tmsp = tmsa[:]
	}
	node.stat.Atim = tmsp[0]
	node.stat.Mtim = tmsp[1]
	return 0
}

// Getattr gets file attributes.
func (f *Ffdfs) Getattr(path string, stat *fuse.Stat_t, fh uint64) (errc int) {
	defer f.synchronize()()

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

func (f *Ffdfs) Opendir(path string) (errc int, fh uint64) {
	defer f.synchronize()()

	return f.openNode(path, true)
}

func (f *Ffdfs) Open(path string, flags int) (errc int, fh uint64) {
	defer f.synchronize()()

	return f.openNode(path, false)
}

// Read reads data from a file.
func (f *Ffdfs) Read(path string, buff []byte, ofst int64, fh uint64) (n int) {
	defer f.synchronize()()
	node := f.getNode(path, fh)
	if node.readsInFlight == nil {
		r, _, err := f.api.ReadSeekCloser(f.api.Pod.GetPodName(), path, f.api.DfsSessionId)
		if err != nil {
			f.log.Errorf("read: download failed %s: %s", path, err.Error())
			return -fuse.EIO
		}
		node.readsInFlight = r
	}

	_, err := node.readsInFlight.Seek(ofst, 0)
	if err != nil {
		f.log.Errorf("read: seek failed %s: %s", path, err.Error())
		return -fuse.EIO
	}
	dBufLen := int64(len(buff))
	if node.stat.Size < int64(len(buff)) {
		dBufLen = node.stat.Size
	}
	dBuf := make([]byte, dBufLen)
	n, err = node.readsInFlight.Read(dBuf)
	if err != nil {
		f.log.Errorf("read: read failed %s: %s", path, err.Error())
		return -fuse.EIO
	}
	if ofst+int64(n) == node.stat.Size {
		node.readsInFlight = nil
	}
	return copy(buff, dBuf[:n])
}

func (f *Ffdfs) Mknod(path string, mode uint32, dev uint64) (errc int) {
	defer f.synchronize()()
	return f.makeNode(path, mode, dev, nil)
}

func (f *Ffdfs) Write(path string, buff []byte, ofst int64, fh uint64) (n int) {
	defer f.synchronize()()
	node := f.getNode(path, fh)
	if nil == node {
		return -fuse.ENOENT
	}
	endofst := ofst + int64(len(buff))
	if endofst > node.stat.Size {
		node.stat.Size = endofst
	}
	bcopy := make([]byte, len(buff))
	copy(bcopy, buff)

	newOp := &ops{
		start: ofst,
		end:   ofst + int64(len(buff)),
		buf:   bcopy,
		tmsp:  time.Now().UnixNano(),
	}

	node.enqueueWriteOp(newOp)
	tmsp := fuse.Now()
	node.stat.Ctim = tmsp
	node.stat.Mtim = tmsp
	return len(buff)
}

func (f *Ffdfs) Setxattr(path string, name string, value []byte, flags int) (errc int) {
	defer f.synchronize()()

	node := f.lookupNode(path)
	if nil == node {
		return -fuse.ENOENT
	}
	defer node.Close()

	if "com.apple.ResourceFork" == name {
		f.log.Errorf("unsupported xatr %v", name)
		return -fuse.ENOTSUP
	}
	if fuse.XATTR_CREATE == flags {
		if _, ok := node.xatr[name]; ok {
			f.log.Errorf("xatr already exists %v", name)
			return -fuse.EEXIST
		}
	} else if fuse.XATTR_REPLACE == flags {
		if _, ok := node.xatr[name]; !ok {
			f.log.Errorf("xatr not found %v", name)
			return -fuse.ENOATTR
		}
	}
	xatr := make([]byte, len(value))
	copy(xatr, value)
	if nil == node.xatr {
		node.xatr = map[string][]byte{}
	}
	node.xatr[name] = xatr
	return 0
}

func (f *Ffdfs) Getxattr(path string, name string) (errc int, xatr []byte) {
	defer f.synchronize()()

	node := f.lookupNode(path)
	if nil == node {
		return -fuse.ENOENT, nil
	}
	if "com.apple.ResourceFork" == name {
		f.log.Errorf("unsupported xatr %v", name)
		return -fuse.ENOTSUP, nil
	}
	xatr, ok := node.xatr[name]
	if !ok {
		f.log.Errorf("xatr not found %v", name)
		return -fuse.ENOATTR, nil
	}
	return 0, xatr
}

func (f *Ffdfs) Removexattr(path string, name string) (errc int) {
	defer f.synchronize()()

	node := f.lookupNode(path)
	if nil == node {
		return -fuse.ENOENT
	}
	defer node.Close()

	if "com.apple.ResourceFork" == name {
		f.log.Errorf("unsupported xatr %v", name)
		return -fuse.ENOTSUP
	}
	if _, ok := node.xatr[name]; !ok {
		f.log.Errorf("xatr not found %v", name)
		return -fuse.ENOATTR
	}
	delete(node.xatr, name)
	return 0
}

func (f *Ffdfs) Listxattr(path string, fill func(name string) bool) (errc int) {
	defer f.synchronize()()

	node := f.lookupNode(path)
	if nil == node {
		return -fuse.ENOENT
	}
	for name := range node.xatr {
		if !fill(name) {
			f.log.Errorf("failed to fill xatr %s", name)
			return -fuse.ERANGE
		}
	}
	return 0
}

func (f *Ffdfs) Chflags(path string, flags uint32) (errc int) {
	defer f.synchronize()()

	node := f.lookupNode(path)
	if nil == node {
		return -fuse.ENOENT
	}
	defer node.Close()

	node.stat.Flags = flags
	node.stat.Ctim = fuse.Now()
	return 0
}

func (f *Ffdfs) Chmod(path string, mode uint32) (errc int) {
	defer f.synchronize()()

	node := f.lookupNode(path)
	if nil == node {
		return -fuse.ENOENT
	}
	defer node.Close()

	node.stat.Mode = (node.stat.Mode & fuse.S_IFMT) | mode&07777
	node.stat.Ctim = fuse.Now()
	return 0
}

func (f *Ffdfs) Chown(path string, uid uint32, gid uint32) (errc int) {
	defer f.synchronize()()

	node := f.lookupNode(path)
	if nil == node {
		return -fuse.ENOENT
	}
	defer node.Close()

	if ^uint32(0) != uid {
		node.stat.Uid = uid
	}
	if ^uint32(0) != gid {
		node.stat.Gid = gid
	}
	node.stat.Ctim = fuse.Now()
	return 0
}

func (f *Ffdfs) Mkdir(path string, mode uint32) int {
	defer f.synchronize()()
	return f.makeNode(path, fuse.S_IFDIR|(mode&07777), 0, nil)
}

func (f *Ffdfs) Truncate(path string, size int64, fh uint64) int {
	defer f.synchronize()()
	node := f.getNode(path, fh)
	if nil == node {
		return -fuse.ENOENT
	}
	_, err := f.api.WriteAt(node.id, bytes.NewReader([]byte{}), uint64(0), true)
	if err != nil {
		f.log.Errorf("failed write %v", err)
		return -fuse.EIO
	}
	node.stat.Size = size
	tmsp := fuse.Now()
	node.stat.Ctim = tmsp
	node.stat.Mtim = tmsp

	return 0
}

func (f *Ffdfs) Releasedir(path string, fh uint64) (errc int) {
	defer f.synchronize()()

	return f.closeNode(fh)
}

func (f *Ffdfs) Release(path string, fh uint64) (errc int) {
	defer f.synchronize()()
	return f.closeNode(fh)
}

// Unlink removes a file.
func (f *Ffdfs) Unlink(path string) int {
	defer f.synchronize()()

	return f.removeNode(path, false)
}

// Rmdir removes a directory.
func (f *Ffdfs) Rmdir(path string) int {
	defer f.synchronize()()

	return f.removeNode(path, true)
}

func (f *Ffdfs) Rename(oldpath string, newpath string) (errc int) {
	defer f.synchronize()()

	if newpath == oldpath {
		return 0
	}

	oldnode := f.lookupNode(oldpath)
	if nil == oldnode {
		return -fuse.ENOENT
	}
	oldprnt := f.lookupNode(filepath.Dir(oldpath))
	if nil == oldprnt {
		return -fuse.ENOENT
	}

	if "" == filepath.Base(newpath) {
		// guard against directory loop creation
		return -fuse.EINVAL
	}

	newnode := f.lookupNode(newpath)
	if nil != newnode {
		errc = f.removeNode(newpath, fuse.S_IFDIR == oldnode.stat.Mode&fuse.S_IFMT)
		if 0 != errc {
			return errc
		}
	}
	newprnt := f.lookupNode(filepath.Dir(newpath))
	if nil == newprnt {
		return -fuse.ENOENT
	}
	if nil == newnode {
		newprnt.chldrn = append(newprnt.chldrn, filepath.Base(newpath))
	}
	for idx, chld := range oldprnt.chldrn {
		if chld == filepath.Base(oldpath) {
			oldprnt.chldrn = append(oldprnt.chldrn[:idx], oldprnt.chldrn[idx+1:]...)
			break
		}
	}

	oldnode.id = newpath
	if oldnode.isDir() {
		err := f.api.API.RenameDir(f.api.Pod.GetPodName(), oldpath, newpath, f.api.DfsSessionId)
		if err != nil {
			f.log.Errorf("failed renaming dir %v", err)
			return -fuse.EIO
		}
	} else {
		err := f.api.API.RenameFile(f.api.Pod.GetPodName(), oldpath, newpath, f.api.DfsSessionId)
		if err != nil {
			f.log.Errorf("failed renaming file %v", err)
			return -fuse.EIO
		}
	}

	err := oldnode.Close()
	if err != nil {
		f.log.Errorf("failed closing node %v", err)
		return -fuse.EIO
	}
	return 0
}
func (f *Ffdfs) Setcrtime(path string, tmsp fuse.Timespec) (errc int) {
	defer f.synchronize()()

	node := f.lookupNode(path)
	if nil == node {
		return -fuse.ENOENT
	}
	defer node.Close()

	node.stat.Birthtim = tmsp
	node.stat.Ctim = fuse.Now()
	return 0
}

func (f *Ffdfs) Setchgtime(path string, tmsp fuse.Timespec) (errc int) {
	defer f.synchronize()()

	node := f.lookupNode(path)
	if nil == node {
		return -fuse.ENOENT
	}
	defer node.Close()

	node.stat.Ctim = tmsp
	return 0
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

func (f *Ffdfs) makeNode(path string, mode uint32, dev uint64, data []byte) int {
	prnt := f.lookupNode(filepath.Dir(path))
	if nil == prnt {
		return -fuse.ENOENT
	}
	defer prnt.Close()

	node := f.lookupNode(path)
	if nil != node {
		return -fuse.EEXIST
	}
	f.ino++
	uid, gid, _ := fuse.Getcontext()
	node = newNode(path, dev, f.ino, mode, uid, gid)
	if nil != data {
		data = []byte{}
	}
	prntPath := filepath.Dir(path)
	flnm := filepath.Base(path)
	if mode&fuse.S_IFDIR > 0 {
		err := f.api.API.Mkdir(f.api.Pod.GetPodName(), path, f.api.DfsSessionId)
		if err != nil {
			f.log.Errorf("failed creating dir at %s: %v", path, err)
			return -fuse.EIO
		}
	} else {
		err := f.api.API.UploadFile(f.api.Pod.GetPodName(), flnm, f.api.DfsSessionId, int64(len(data)), bytes.NewReader(data), prntPath, "", blockSize)
		if err != nil {
			return -fuse.EIO
		}
		node.stat.Size = int64(len(data))
	}

	if err := node.Close(); err != nil {
		return -fuse.EIO
	}

	prnt.chldrn = append(prnt.chldrn, filepath.Base(path))
	prnt.stat.Ctim = node.stat.Ctim
	prnt.stat.Mtim = node.stat.Ctim
	return 0
}

func (f *Ffdfs) removeNode(path string, dir bool) int {
	prnt := f.lookupNode(filepath.Dir(path))
	if nil == prnt {
		return -fuse.ENOENT
	}
	defer prnt.Close()

	node := f.lookupNode(path)
	if nil == node {
		return -fuse.ENOENT
	}
	defer node.Close()

	if !dir && fuse.S_IFDIR == node.stat.Mode&fuse.S_IFMT {
		f.log.Errorf("failed removing %s is a dir", path)
		return -fuse.EISDIR
	}
	if dir && fuse.S_IFDIR != node.stat.Mode&fuse.S_IFMT {
		f.log.Errorf("failed removing %s is not a dir", path)
		return -fuse.ENOTDIR
	}

	//if 0 < len(node.chldrn) {
	//	f.log.Errorf("failed removing %s is a dir and not empty", path)
	//	return -fuse.ENOTEMPTY
	//}
	node.stat.Nlink--
	for idx, chld := range prnt.chldrn {
		if chld == filepath.Base(path) {
			prnt.chldrn = append(prnt.chldrn[:idx], prnt.chldrn[idx+1:]...)
			break
		}
	}
	tmsp := fuse.Now()
	node.stat.Ctim = tmsp
	prnt.stat.Ctim = tmsp
	prnt.stat.Mtim = tmsp

	if dir {
		err := f.api.API.RmDir(f.api.Pod.GetPodName(), path, f.api.DfsSessionId)
		if err != nil {
			f.log.Errorf("failed removing dir at %s: %v", path, err)
			return -fuse.EIO
		}
	}
	err := f.api.API.DeleteFile(f.api.Pod.GetPodName(), path, f.api.DfsSessionId)
	if err != nil {
		f.log.Errorf("failed removing file at %s: %v", path, err)
		return -fuse.EIO
	}
	return 0
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
		for _, op := range node.writesInFlight {
			_, err := f.api.WriteAt(node.id, bytes.NewReader(op.buf), uint64(op.start), false)
			if err != nil {
				f.log.Errorf("failed write %v", err)
				return -fuse.EIO
			}
		}
		node.writesInFlight = nil
		err := node.Close()
		if err != nil {
			return -fuse.EIO
		}
		delete(f.openmap, node.stat.Ino)
	}
	return 0
}

func (n *node_t) Close() error {
	return nil
}

func (f *Ffdfs) synchronize() func() {
	f.lock.Lock()
	return func() {
		f.lock.Unlock()
	}
}

//lookupNode will get metadata from fairos
func (f *Ffdfs) lookupNode(path string) (node *node_t) {
	uid, gid, _ := fuse.Getcontext()
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
				Uid:      uid,
				Gid:      gid,
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
			Mode:     fuse.S_IFREG | 0666,
			Nlink:    1,
			Atim:     fuse.NewTimespec(time.Unix(accTime, 0)),
			Mtim:     fuse.NewTimespec(time.Unix(modTime, 0)),
			Birthtim: fuse.NewTimespec(time.Unix(creationTime, 0)),
			Flags:    0,
			Uid:      uid,
			Gid:      gid,
		},
		xatr:    nil,
		opencnt: 0,
	}
	node.stat.Size, _ = strconv.ParseInt(fStat.FileSize, 10, 64)
	return
}

var _ fuse.FileSystemChflags = (*Ffdfs)(nil)
var _ fuse.FileSystemSetcrtime = (*Ffdfs)(nil)
var _ fuse.FileSystemSetchgtime = (*Ffdfs)(nil)
