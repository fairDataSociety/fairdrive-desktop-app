package fuse

import (
	"bytes"
	"fmt"
	"io"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/fairdatasociety/fairOS-dfs/pkg/logging"
	"github.com/fairdatasociety/fairOS-dfs/pkg/pod"
	"github.com/fairdatasociety/fairdrive-desktop-app/pkg/api"
	"github.com/winfsp/cgofuse/fuse"
)

const (
	sysBlockSize uint64 = 4096
	fdsBlockSize uint64 = 1048576       // ~ 1MB
	free         uint64 = 1099511627776 // ~ 1024GB
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
	files          []string
	dirs           []string
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
		self.dirs = []string{}
		self.files = []string{}
	}
	return &self
}

func (n *node_t) isDir() bool {
	return n.stat.Mode&fuse.S_IFDIR > 0
}

type Ffdfs struct {
	fuse.FileSystemBase
	lock              sync.Mutex
	log               logging.Logger
	api               *api.DfsAPI
	sessionId         string
	ino               uint64
	openmap           map[uint64]*node_t
	ongoingWriteSizes map[string]int64
	pod               *pod.Info
}

func New(sessionId string, pod *pod.Info, api *api.DfsAPI, logger logging.Logger) (*Ffdfs, error) {
	f := &Ffdfs{
		log:       logger,
		api:       api,
		pod:       pod,
		sessionId: sessionId,
	}
	f.openmap = map[uint64]*node_t{}
	f.ongoingWriteSizes = map[string]int64{}
	return f, nil
}

func (f *Ffdfs) CacheClean() {
	defer f.synchronize()()

	f.openmap = map[uint64]*node_t{}
}

// Statfs sets the filesystem stats
func (f *Ffdfs) Statfs(_ string, stat *fuse.Statfs_t) int {
	// TODO fix space availability logic based on batchID
	// bFree is just a place holder for now for demo
	stat.Frsize = sysBlockSize
	stat.Bsize = sysBlockSize
	stat.Bfree = free / sysBlockSize
	stat.Bavail = free / sysBlockSize
	stat.Files = 1e9 // Total files in file system.
	stat.Ffree = 1e9 // Free files in file system.
	stat.Namemax = 255
	return 0
}

// Mknod creates a file node.
func (f *Ffdfs) Mknod(path string, mode uint32, dev uint64) (errc int) {
	defer f.synchronize()()

	f.log.Debugf("mknod: creating file: %s", path)
	return f.makeNode(path, mode, dev, nil)
}

// Mkdir creates a directory
func (f *Ffdfs) Mkdir(path string, mode uint32) int {
	defer f.synchronize()()

	f.log.Debugf("mkdir: creating directory: %s", path)
	return f.makeNode(path, fuse.S_IFDIR|(mode&07777), 0, nil)
}

// Unlink removes a file.
func (f *Ffdfs) Unlink(path string) int {
	defer f.synchronize()()

	f.log.Debugf("unlink: removing file: %s", path)
	return f.removeNode(path, false)
}

// Rmdir removes a directory.
func (f *Ffdfs) Rmdir(path string) int {
	defer f.synchronize()()

	f.log.Debugf("rmdir: removing directory: %s", path)
	return f.removeNode(path, true)
}

// Rename renames a node
func (f *Ffdfs) Rename(oldpath string, newpath string) (errc int) {
	defer f.synchronize()()
	f.log.Debugf("Rename: rename directory: %s to %s", oldpath, newpath)

	if newpath == oldpath {
		return 0
	}

	// This is a very dirty way to prevent "chunk already exist" on timestamped feed updated
	// The above happens when we try to update matadata in the same timestamp
	// TODO fix this by saving the last rename request timestamp and path in the fdfs instance
	// and wait only if both matches the current request
	<-time.After(time.Second)

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
	if nil != newnode {
		if oldnode.isDir() {
			newprnt.dirs = append(newprnt.dirs, filepath.Base(newpath))
		} else {
			newprnt.files = append(newprnt.files, filepath.Base(newpath))
		}
	}
	if oldnode.isDir() {
		for idx, chld := range oldprnt.dirs {
			if chld == filepath.Base(oldpath) {
				oldprnt.dirs = append(oldprnt.dirs[:idx], oldprnt.dirs[idx+1:]...)
				break
			}
		}
	} else {
		for idx, chld := range oldprnt.files {
			if chld == filepath.Base(oldpath) {
				oldprnt.files = append(oldprnt.files[:idx], oldprnt.files[idx+1:]...)
				break
			}
		}
	}

	oldnode.id = newpath
	if oldnode.isDir() {
		err := f.api.API.RenameDir(f.pod.GetPodName(), oldpath, newpath, f.sessionId, false)
		if err != nil {
			f.log.Errorf("failed renaming dir %v", err)
			return -fuse.EIO
		}
	} else {
		err := f.api.API.RenameFile(f.pod.GetPodName(), oldpath, newpath, f.sessionId, false)
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

func (f *Ffdfs) Chmod(path string, mode uint32) (errc int) {
	defer f.synchronize()()
	f.log.Debugf("Chmod: chmod: %s to %d", path, mode)

	var node *node_t
	for _, v := range f.openmap {
		if v.id == path {
			node = v
			break
		}
	}

	if node == nil {
		node = f.lookupNode(path)
		if nil == node {
			return -fuse.ENOENT
		}
		defer node.Close()
	}

	// this is to prevent calling chmod multiple times by os after creating a file
	if time.Since(node.stat.Birthtim.Time()) < time.Second*10 {
		return 0
	}

	// check if mode is same as node.stat.Mode
	if node.stat.Mode == (node.stat.Mode&fuse.S_IFMT)|mode&07777 {
		return 0
	}

	node.stat.Mode = (node.stat.Mode & fuse.S_IFMT) | mode&07777
	node.stat.Ctim = fuse.Now()

	if node.isDir() {
		err := f.api.ChmodDir(f.pod.GetPodName(), path, f.sessionId, node.stat.Mode, false)
		if err != nil {
			return -fuse.ENOENT
		}
		return 0
	}

	err := f.api.ChmodFile(f.pod.GetPodName(), path, f.sessionId, node.stat.Mode, false)
	if err != nil {
		return -fuse.ENOENT
	}

	return 0
}

func (f *Ffdfs) Chown(path string, uid uint32, gid uint32) (errc int) {
	defer f.synchronize()()
	f.log.Debugf("Chown: chown: %s to %d:%d", path, uid, gid)

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

func (f *Ffdfs) Utimens(path string, tmsp []fuse.Timespec) (errc int) {
	defer f.synchronize()()
	f.log.Debugf("Utimens: utimens: %s", path)

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

func (f *Ffdfs) Open(path string, flags int) (errc int, fh uint64) {
	defer f.synchronize()()

	f.log.Debugf("open: file %s", path)
	return f.openNode(path, false)
}

// Getattr gets file attributes.
func (f *Ffdfs) Getattr(path string, stat *fuse.Stat_t, fh uint64) (errc int) {
	defer f.synchronize()()
	f.log.Debugf("getattr: %s", path)
	node := f.getNode(path, fh)
	if nil == node {
		f.log.Errorf("getattr: failed: %s", path)
		return -fuse.ENOENT
	}
	*stat = node.stat
	size, ok := f.ongoingWriteSizes[path]
	if stat.Size == 0 && ok {
		stat.Size = size
	}
	return 0
}

func (f *Ffdfs) Truncate(path string, size int64, fh uint64) int {
	defer f.synchronize()()
	f.log.Debugf("truncating file: %s", path)
	node := f.getNode(path, fh)
	if nil == node {
		return -fuse.ENOENT
	}
	_, err := f.api.WriteAtFile(f.pod.GetPodName(), node.id, f.sessionId, bytes.NewReader([]byte{}), uint64(0), true, false)
	if err != nil {
		f.log.Errorf("truncate :failed write %v", err)
		return -fuse.EIO
	}
	node.stat.Size = size
	tmsp := fuse.Now()
	node.stat.Ctim = tmsp
	node.stat.Mtim = tmsp

	return 0
}

// Read reads data from a file.
func (f *Ffdfs) Read(path string, buff []byte, ofst int64, fh uint64) (n int) {
	defer f.synchronize()()
	fmt.Printf("1 read: file %s from %d to %d\n", path, ofst, ofst+int64(len(buff)))
	f.log.Debugf("read: file %s from %d to %d", path, ofst, ofst+int64(len(buff)))
	node := f.getNode(path, fh)
	if ofst == node.stat.Size {
		return 0
	}

	fmt.Printf("2 read: file %s from %d to %d\n", path, ofst, ofst+int64(len(buff)))
	if node.readsInFlight == nil {
		r, _, err := f.api.ReadSeekCloser(f.pod.GetPodName(), path, f.sessionId, false)
		if err != nil {
			f.log.Errorf("read: download failed %s: %s", path, err.Error())
			return -fuse.EIO
		}
		node.readsInFlight = r
	}
	fmt.Printf("3 read: file %s from %d to %d\n", path, ofst, ofst+int64(len(buff)))
	_, err := node.readsInFlight.Seek(ofst, 0)
	if err != nil {
		f.log.Errorf("read: seek failed %s: %s", path, err.Error())
		return -fuse.EIO
	}
	fmt.Printf("4 read: file %s from %d to %d\n", path, ofst, ofst+int64(len(buff)))
	dBufLen := int64(len(buff))
	if node.stat.Size-ofst < int64(len(buff)) {
		dBufLen = node.stat.Size - ofst
	}
	dBuf := make([]byte, dBufLen)
	n, err = node.readsInFlight.Read(dBuf)
	if err != nil {
		f.log.Errorf("read: read failed %s: %s", path, err.Error())
		return -fuse.EIO
	}
	fmt.Printf("5 read: file %s from %d to %d\n", path, ofst, ofst+int64(len(buff)))
	if ofst+int64(n) == node.stat.Size {
		node.readsInFlight.Close()
		node.readsInFlight = nil
	}
	return copy(buff, dBuf[:n])
}

func (f *Ffdfs) Write(path string, buff []byte, ofst int64, fh uint64) (n int) {
	defer f.synchronize()()
	f.log.Debugf("write: file %s from %d to %d", path, ofst, ofst+int64(len(buff)))
	node := f.getNode(path, fh)
	if nil == node {
		return -fuse.ENOENT
	}
	endofst := ofst + int64(len(buff))
	if endofst > node.stat.Size {
		node.stat.Size = endofst
		f.ongoingWriteSizes[path] = node.stat.Size
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

func (f *Ffdfs) Release(path string, fh uint64) (errc int) {
	defer f.synchronize()()
	f.log.Debugf("release: file %s", path)
	return f.closeNode(fh)
}

func (f *Ffdfs) Opendir(path string) (errc int, fh uint64) {
	defer f.synchronize()()

	f.log.Debugf("opendir: directory %s", path)
	return f.openNode(path, true)
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
	f.log.Debugf("readdir: directory %s", path)
	node := f.getNode(path, fh)
	if nil == node {
		return -fuse.ENOENT
	}

	fill(".", &node.stat, 0)
	fill("..", nil, 0)
	for _, chld := range node.dirs {
		nd := f.lookup(filepath.Join(path, chld), true)
		if nd != nil && !fill(chld, &nd.stat, 0) {
			break
		}
	}
	for _, chld := range node.files {
		nd := f.lookup(filepath.Join(path, chld), false)
		if nd != nil && !fill(chld, &nd.stat, 0) {
			break
		}
	}
	return 0
}

func (f *Ffdfs) Releasedir(path string, fh uint64) (errc int) {
	defer f.synchronize()()
	err := f.closeNode(fh)
	if err != 0 {
		f.log.Errorf("releasedir: directory err %s", path)
	}
	return f.closeNode(fh)
}

func (f *Ffdfs) Setxattr(path string, name string, value []byte, flags int) (errc int) {
	f.log.Debugf("setxattr: file %s", path)
	return 0
}

func (f *Ffdfs) Getxattr(path string, name string) (errc int, xatr []byte) {
	f.log.Debugf("getxattr: file %s", path)
	return 0, []byte{}
}

func (f *Ffdfs) Removexattr(path string, name string) (errc int) {
	f.log.Debugf("removexattr: file %s", path)
	return 0
}

func (f *Ffdfs) Listxattr(path string, fill func(name string) bool) (errc int) {
	f.log.Debugf("listxattr: file %s", path)
	return 0
}

func (f *Ffdfs) Chflags(path string, flags uint32) (errc int) {
	defer f.synchronize()()
	f.log.Debugf("chflags: file %s", path)
	node := f.lookupNode(path)
	if nil == node {
		return -fuse.ENOENT
	}
	defer node.Close()

	node.stat.Flags = flags
	node.stat.Ctim = fuse.Now()
	return 0
}

func (f *Ffdfs) Setcrtime(path string, tmsp fuse.Timespec) (errc int) {
	defer f.synchronize()()
	f.log.Debugf("setcrtime: file %s", path)
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
	f.log.Debugf("setchgtime: file %s", path)
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
	prntPath := filepath.Dir(path)
	flnm := filepath.Base(path)
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
	if nil == data {
		data = []byte{}
	}

	if mode&fuse.S_IFDIR > 0 {
		err := f.api.API.Mkdir(f.pod.GetPodName(), path, f.sessionId, mode, false)
		if err != nil {
			f.log.Errorf("fuse:failed creating dir at %s: %v", path, err)
			return -fuse.EIO
		}
		prnt.dirs = append(prnt.dirs, filepath.Base(path))
	} else {
		err := f.api.API.UploadFile(f.pod.GetPodName(), flnm, f.sessionId, int64(len(data)), bytes.NewReader(data), prntPath, "", uint32(fdsBlockSize), mode, false, false)
		if err != nil {
			f.log.Errorf("fuse: failed creating file at %s: %v", path, err)
			return -fuse.EIO
		}
		node.stat.Size = int64(len(data))
		prnt.files = append(prnt.files, filepath.Base(path))
	}

	if err := node.Close(); err != nil {
		f.log.Errorf("failed mknode close dir %v", err)
		return -fuse.EIO
	}

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
	if dir {
		for idx, chld := range prnt.dirs {
			if chld == filepath.Base(path) {
				prnt.dirs = append(prnt.dirs[:idx], prnt.dirs[idx+1:]...)
				break
			}
		}
	} else {
		for idx, chld := range prnt.files {
			if chld == filepath.Base(path) {
				prnt.files = append(prnt.files[:idx], prnt.files[idx+1:]...)
				break
			}
		}
	}

	tmsp := fuse.Now()
	node.stat.Ctim = tmsp
	prnt.stat.Ctim = tmsp
	prnt.stat.Mtim = tmsp

	if dir {
		err := f.api.API.RmDir(f.pod.GetPodName(), path, f.sessionId, false)
		if err != nil {
			f.log.Errorf("failed removing dir at %s: %v", path, err)
			return -fuse.EIO
		}
		return 0
	}
	err := f.api.API.DeleteFile(f.pod.GetPodName(), path, f.sessionId, false)
	if err != nil {
		f.log.Errorf("failed removing file at %s: %v", path, err)
		return -fuse.EIO
	}
	return 0
}

func (f *Ffdfs) openNode(path string, dir bool) (int, uint64) {
	for _, v := range f.openmap {
		if path == v.id {
			v.opencnt++
			return 0, v.stat.Ino
		}
	}
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
			f.log.Debugf("write: file %s from %d to %d", node.id, uint64(op.start), len(op.buf))
			_, err := f.api.WriteAtFile(f.pod.GetPodName(), node.id, f.sessionId, bytes.NewReader(op.buf), uint64(op.start), false, false)
			if err != nil {
				f.log.Errorf("failed write %v", err)
				return -fuse.EIO
			}
		}

		delete(f.ongoingWriteSizes, node.id)
		node.writesInFlight = nil
		err := node.Close()
		if err != nil {
			f.log.Errorf("closeNode %v", err)
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

// lookupNode will get metadata from fairos
func (f *Ffdfs) lookupNode(path string) (node *node_t) {
	uid, gid, _ := fuse.Getcontext()
	if path != "/" {
		fStat, err := f.api.FileStat(f.pod.GetPodName(), filepath.ToSlash(path), f.sessionId, false)
		if err == nil {
			accTime, err := strconv.ParseInt(fStat.AccessTime, 10, 64)
			if err != nil {
				f.log.Warningf("lookup failed for %s: %s", path, err.Error())
				return
			}
			modTime, err := strconv.ParseInt(fStat.ModificationTime, 10, 64)
			if err != nil {
				f.log.Warningf("lookup failed for %s: %s", path, err.Error())
				return
			}
			creationTime, err := strconv.ParseInt(fStat.CreationTime, 10, 64)
			if err != nil {
				f.log.Warningf("lookup failed for %s: %s", path, err.Error())
				return
			}
			f.ino++
			//mode := fStat.Mode
			//if mode == 0 {
			//	mode = fuse.S_IFREG | 0o755
			//}
			mode := uint32(fuse.S_IFREG | 0o755)
			node = &node_t{
				id: path,
				stat: fuse.Stat_t{
					Ino:      f.ino,
					Mode:     mode,
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
	}
	dirInode, err := f.api.DirectoryInode(f.pod.GetPodName(), filepath.ToSlash(path), f.sessionId, false)
	if err != nil {
		f.log.Warningf("lookup failed for %s: %s", path, err.Error())
		return
	}
	files := []string{}
	dirs := []string{}
	for _, fileOrDirName := range dirInode.FileOrDirNames {
		if strings.HasPrefix(fileOrDirName, "_D_") {
			dirName := strings.TrimPrefix(fileOrDirName, "_D_")
			dirs = append(dirs, dirName)
		} else if strings.HasPrefix(fileOrDirName, "_F_") {
			fileName := strings.TrimPrefix(fileOrDirName, "_F_")
			files = append(files, fileName)
		}
	}
	f.ino++

	mode := dirInode.Meta.Mode
	if mode == 0 {
		mode = fuse.S_IFDIR | 07777
	}

	node = &node_t{
		id: path,
		stat: fuse.Stat_t{
			Ino:      f.ino,
			Mode:     mode,
			Nlink:    1,
			Atim:     fuse.NewTimespec(time.Unix(dirInode.Meta.AccessTime, 0)),
			Mtim:     fuse.NewTimespec(time.Unix(dirInode.Meta.ModificationTime, 0)),
			Birthtim: fuse.NewTimespec(time.Unix(dirInode.Meta.CreationTime, 0)),
			Flags:    0,
			Uid:      uid,
			Gid:      gid,
		},
		xatr:    nil,
		files:   files,
		dirs:    dirs,
		opencnt: 0,
	}
	return
}

// lookup will get metadata from fairos
func (f *Ffdfs) lookup(path string, isDir bool) (node *node_t) {
	uid, gid, _ := fuse.Getcontext()
	if isDir {
		dirInode, err := f.api.DirectoryInode(f.pod.GetPodName(), filepath.ToSlash(path), f.sessionId, false)
		if err != nil {
			f.log.Warningf("lookup failed for %s: %s", path, err.Error())
			return
		}
		files := []string{}
		dirs := []string{}
		for _, fileOrDirName := range dirInode.FileOrDirNames {
			if strings.HasPrefix(fileOrDirName, "_D_") {
				dirName := strings.TrimPrefix(fileOrDirName, "_D_")
				dirs = append(dirs, dirName)
			} else if strings.HasPrefix(fileOrDirName, "_F_") {
				fileName := strings.TrimPrefix(fileOrDirName, "_F_")
				files = append(files, fileName)
			}
		}
		f.ino++

		mode := dirInode.Meta.Mode
		if mode == 0 {
			mode = fuse.S_IFDIR | 0777
		}

		node = &node_t{
			id: path,
			stat: fuse.Stat_t{
				Ino:      f.ino,
				Mode:     mode,
				Nlink:    1,
				Atim:     fuse.NewTimespec(time.Unix(dirInode.Meta.AccessTime, 0)),
				Mtim:     fuse.NewTimespec(time.Unix(dirInode.Meta.ModificationTime, 0)),
				Birthtim: fuse.NewTimespec(time.Unix(dirInode.Meta.CreationTime, 0)),
				Flags:    0,
				Uid:      uid,
				Gid:      gid,
			},
			xatr:    nil,
			files:   files,
			dirs:    dirs,
			opencnt: 0,
		}
		return
	}
	fStat, err := f.api.FileStat(f.pod.GetPodName(), filepath.ToSlash(path), f.sessionId, false)
	if err != nil {
		f.log.Warningf("lookup failed for %s: %s", path, err.Error())
		return
	}
	accTime, err := strconv.ParseInt(fStat.AccessTime, 10, 64)
	if err != nil {
		f.log.Warningf("lookup failed for %s: %s", path, err.Error())
		return
	}
	modTime, err := strconv.ParseInt(fStat.ModificationTime, 10, 64)
	if err != nil {
		f.log.Warningf("lookup failed for %s: %s", path, err.Error())
		return
	}
	creationTime, err := strconv.ParseInt(fStat.ModificationTime, 10, 64)
	if err != nil {
		f.log.Warningf("lookup failed for %s: %s", path, err.Error())
		return
	}
	f.ino++
	//mode := fStat.Mode
	//if mode == 0 {
	//	mode = fuse.S_IFREG | 0o755
	//}
	mode := uint32(fuse.S_IFREG | 0o755)

	node = &node_t{
		id: path,
		stat: fuse.Stat_t{
			Ino:      f.ino,
			Mode:     mode,
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
