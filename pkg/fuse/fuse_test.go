package fuse

import (
	"crypto/rand"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/winfsp/cgofuse/fuse"

	"github.com/datafund/fdfs/pkg/api"
	"github.com/fairdatasociety/fairOS-dfs/pkg/dfs"

	"github.com/fairdatasociety/fairOS-dfs/pkg/blockstore/bee/mock"
	mock2 "github.com/fairdatasociety/fairOS-dfs/pkg/ensm/eth/mock"
	"github.com/fairdatasociety/fairOS-dfs/pkg/file"
	"github.com/fairdatasociety/fairOS-dfs/pkg/logging"
	"github.com/fairdatasociety/fairOS-dfs/pkg/user"
	"github.com/plexsysio/taskmanager"
)

func TestList(t *testing.T) {
	mockClient := mock.NewMockBeeClient()
	logger := logging.New(io.Discard, 0)
	ens := mock2.NewMockNamespaceManager()
	tm := taskmanager.New(1, 10, time.Second*15, logger)
	password := "password1"
	username := "fdfs"
	userObject := user.NewUsers("", mockClient, ens, logger)
	_, _, _, _, ui, err := userObject.CreateNewUserV2(username, password, "", "", tm)
	if err != nil {
		t.Fatal(err)
	}
	pod1 := ui.GetPod()
	podName1 := "test1"
	pi, err := pod1.CreatePod(podName1, password, "")
	if err != nil {
		t.Fatalf("error creating pod %s : %s", podName1, err.Error())
	}

	dirObject := pi.GetDirectory()
	fileObject := pi.GetFile()
	err = dirObject.MkRootDir(podName1, pi.GetPodAddress(), pi.GetFeed())
	if err != nil {
		t.Fatal(err)
	}
	err = dirObject.MkDir("/parentDir")
	if err != nil {
		t.Fatal(err)
	}
	err = dirObject.MkDir("/parentDir/subDir1")
	if err != nil {
		t.Fatal(err)
	}
	_, err = uploadFile(t, fileObject, "/parentDir", "file1", "", 100, 10)
	if err != nil {
		t.Fatal(err)
	}
	err = dirObject.AddEntryToDir("/parentDir", "file1", true)
	if err != nil {
		t.Fatal(err)
	}
	_, err = uploadFile(t, fileObject, "/parentDir/subDir1", "file1", "", 100, 10)
	if err != nil {
		t.Fatal(err)
	}
	err = dirObject.AddEntryToDir("/parentDir/subDir1", "file1", true)
	if err != nil {
		t.Fatal(err)
	}
	mntDir, err := os.MkdirTemp("", "tmpfuse")
	if err != nil {
		t.Fatal(err)
	}

	mockDfs := dfs.NewMockDfsAPI(mockClient, userObject, logger, "/")
	dfsApi := &api.DfsAPI{
		API: mockDfs,
	}
	err = dfsApi.Login(username, password)
	if err != nil {
		t.Fatal(err)
	}
	err = dfsApi.OpenPod(podName1, password)
	if err != nil {
		t.Fatal(err)
	}
	f := &Ffdfs{
		log: logger,
		api: dfsApi,
	}
	f.openmap = map[uint64]*node_t{}

	srv := fuse.NewFileSystemHost(f)
	srv.SetCapReaddirPlus(true)

	closer := func() {
		srv.Unmount()
		time.Sleep(time.Second)
		os.RemoveAll(mntDir)
	}
	defer closer()

	sched := make(chan struct{})
	var fuseArgs []string

	go func() {
		close(sched)
		if !srv.Mount(mntDir, fuseArgs) {
			panic("mount returned false")
		}
	}()
	<-sched
	time.Sleep(time.Second)
	files, err := ioutil.ReadDir(mntDir)
	if err != nil {
		t.Fatal(err)
	}
	if len(files) != 1 {
		t.Fatal("list failed on root")
	}
	if files[0].Name() != "parentDir" && !files[0].IsDir() {
		t.Fatal("parentDir not fount")
	}
	checkFiles := []string{filepath.Join("/parentDir", "file1"), filepath.Join("/parentDir/subDir1", "file1")}
	for _, v := range checkFiles {
		st, err := os.Stat(filepath.Join(mntDir, v))
		if err != nil {
			t.Fatal(err)
		}
		if st.Mode().IsDir() {
			t.Fatal("files are not files")
		}
	}
	checkDirs := []string{"/parentDir/subDir1"}
	for _, v := range checkDirs {
		st, err := os.Stat(filepath.Join(mntDir, v))
		if err != nil {
			t.Fatal(err)
		}
		if !st.Mode().IsDir() {
			t.Fatal("dirs are not dirs")
		}
	}
}

func TestWrite(t *testing.T) {
	mockClient := mock.NewMockBeeClient()
	logger := logging.New(io.Discard, 0)
	ens := mock2.NewMockNamespaceManager()
	tm := taskmanager.New(1, 10, time.Second*15, logger)
	password := "password1"
	username := "fdfs"
	userObject := user.NewUsers("", mockClient, ens, logger)
	_, _, _, _, ui, err := userObject.CreateNewUserV2(username, password, "", "", tm)
	if err != nil {
		t.Fatal(err)
	}
	pod1 := ui.GetPod()
	podName1 := "test1"
	pi, err := pod1.CreatePod(podName1, password, "")
	if err != nil {
		t.Fatalf("error creating pod %s : %s", podName1, err.Error())
	}

	dirObject := pi.GetDirectory()
	fileObject := pi.GetFile()
	err = dirObject.MkRootDir(podName1, pi.GetPodAddress(), pi.GetFeed())
	if err != nil {
		t.Fatal(err)
	}
	err = dirObject.MkDir("/parentDir")
	if err != nil {
		t.Fatal(err)
	}

	_, err = uploadFile(t, fileObject, "/parentDir", "file1", "", 100, 10)
	if err != nil {
		t.Fatal(err)
	}

	mntDir, err := os.MkdirTemp("", "tmpfuse")
	if err != nil {
		t.Fatal(err)
	}

	mockDfs := dfs.NewMockDfsAPI(mockClient, userObject, logger, "/")
	dfsApi := &api.DfsAPI{
		API: mockDfs,
	}
	err = dfsApi.Login(username, password)
	if err != nil {
		t.Fatal(err)
	}
	err = dfsApi.OpenPod(podName1, password)
	if err != nil {
		t.Fatal(err)
	}
	f := &Ffdfs{
		log: logger,
		api: dfsApi,
	}
	f.openmap = map[uint64]*node_t{}

	srv := fuse.NewFileSystemHost(f)
	srv.SetCapReaddirPlus(true)

	closer := func() {
		srv.Unmount()
		time.Sleep(time.Second)
		os.RemoveAll(mntDir)
	}
	defer closer()

	sched := make(chan struct{})
	var fuseArgs []string

	go func() {
		close(sched)
		if !srv.Mount(mntDir, fuseArgs) {
			panic("mount returned false")
		}
	}()
	<-sched
	time.Sleep(time.Second)
	fd, err := os.Create(filepath.Join(mntDir, "file1"))
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(fd.Name())

	if _, err = fd.Write([]byte("check check check")); err != nil {
		t.Fatal(err)
	}

	fd.Close()
	fd2, err := os.Open(filepath.Join(mntDir, "file1"))
	if err != nil {
		t.Fatal(err)
	}

	data, err := io.ReadAll(fd2)
	if err != nil {
		t.Fatal(err)
	}
	fd2.Close()

	<-time.After(time.Second)
	err = os.WriteFile(filepath.Join(mntDir, "file1"), []byte("asdasd"), 0666)
	if err != nil {
		t.Fatal(err)
	}
	fd2, err = os.Open(filepath.Join(mntDir, "file1"))
	if err != nil {
		t.Fatal(err)
	}

	data, err = io.ReadAll(fd2)
	if err != nil {
		t.Fatal(err)
	}
	fd2.Close()
	if string(data) != "asdasd" {
		t.Fatal("truncate write failed")
	}
}

func uploadFile(t *testing.T, fileObject *file.File, filePath, fileName, compression string, fileSize int64, blockSize uint32) ([]byte, error) {
	// create a temp file
	fd, err := os.CreateTemp("", fileName)
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(fd.Name())

	// write contents to file
	content := make([]byte, fileSize)
	_, err = rand.Read(content)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = fd.Write(content); err != nil {
		t.Fatal(err)
	}

	// close file
	uploadFileName := fd.Name()
	err = fd.Close()
	if err != nil {
		t.Fatal(err)
	}

	// open file to upload
	f1, err := os.Open(uploadFileName)
	if err != nil {
		t.Fatal(err)
	}

	// upload  the temp file
	return content, fileObject.Upload(f1, fileName, fileSize, blockSize, filePath, compression)
}
