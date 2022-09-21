package fuse

import (
	"crypto/rand"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/datafund/fdfs/pkg/api"
	"github.com/fairdatasociety/fairOS-dfs/pkg/blockstore/bee/mock"
	"github.com/fairdatasociety/fairOS-dfs/pkg/dfs"
	mock2 "github.com/fairdatasociety/fairOS-dfs/pkg/ensm/eth/mock"
	"github.com/fairdatasociety/fairOS-dfs/pkg/file"
	"github.com/fairdatasociety/fairOS-dfs/pkg/logging"
	"github.com/fairdatasociety/fairOS-dfs/pkg/user"
	"github.com/plexsysio/taskmanager"
	"github.com/winfsp/cgofuse/fuse"
)

func setupFairosWithFs(t *testing.T) *api.DfsAPI {
	mockClient := mock.NewMockBeeClient()
	logger := logging.New(os.Stdout, 5)
	ens := mock2.NewMockNamespaceManager()
	tm := taskmanager.New(1, 10, time.Second*15, logger)
	userObject := user.NewUsers("", mockClient, ens, logger)
	password := "password1"
	username := "fdfs"
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
	mockDfs := dfs.NewMockDfsAPI(mockClient, userObject, logger, "/")
	dfsApi := &api.DfsAPI{
		API: mockDfs,
	}
	err = dfsApi.Login(username, password)
	if err != nil {
		t.Fatal(err)
	}
	err = dfsApi.GetPodInfo(podName1, password, false)
	if err != nil {
		t.Fatal(err)
	}
	return dfsApi
}

func setupFairos(t *testing.T) *api.DfsAPI {
	mockClient := mock.NewMockBeeClient()
	logger := logging.New(os.Stdout, 5)
	ens := mock2.NewMockNamespaceManager()
	tm := taskmanager.New(1, 10, time.Second*15, logger)
	userObject := user.NewUsers("", mockClient, ens, logger)
	password := "password1"
	username := "fdfs"
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
	err = dirObject.MkRootDir(podName1, pi.GetPodAddress(), pi.GetFeed())
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
	err = dfsApi.GetPodInfo(podName1, password, false)
	if err != nil {
		t.Fatal(err)
	}
	return dfsApi
}

func newTestFs(t *testing.T, dfsApi *api.DfsAPI) (*Ffdfs, string, func()) {
	logger := logging.New(os.Stdout, 5)
	mntDir, err := os.MkdirTemp("", "tmpfuse")
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

	return f, mntDir, func() {
		srv.Unmount()
		time.Sleep(time.Second)
		os.RemoveAll(mntDir)
	}
}

func TestList(t *testing.T) {
	dfsApi := setupFairosWithFs(t)
	_, mntDir, closer := newTestFs(t, dfsApi)
	defer closer()

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
	dfsApi := setupFairosWithFs(t)
	_, mntDir, closer := newTestFs(t, dfsApi)
	defer closer()

	fd, err := os.Create(filepath.Join(mntDir, "file1"))
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(fd.Name())

	if _, err = fd.Write([]byte("check check check")); err != nil {
		t.Fatal(err)
	}

	fd.Close()
	<-time.After(time.Second)
	err = os.WriteFile(filepath.Join(mntDir, "file1"), []byte("asdasd"), 0666)
	if err != nil {
		t.Fatal(err)
	}
	fd2, err := os.Open(filepath.Join(mntDir, "file1"))
	if err != nil {
		t.Fatal(err)
	}

	data, err := io.ReadAll(fd2)
	if err != nil {
		t.Fatal(err)
	}
	fd2.Close()
	if string(data) != "asdasd" {
		t.Fatal("truncate write failed")
	}
}

//func TestMultiDirWithFiles(t *testing.T) {
//	entries := []struct {
//		path    string
//		isDir   bool
//		size    int64
//		content []byte
//	}{
//		{
//			path:  "dir1",
//			isDir: true,
//		},
//		{
//			path:  "dir2",
//			isDir: true,
//		},
//		{
//			path:  "dir3",
//			isDir: true,
//		},
//		{
//			path: "file1",
//			size: 1024 * 1024,
//		},
//		{
//			path: "dir1/file11",
//			size: 1024 * 512,
//		},
//		{
//			path: "dir1/file12",
//			size: 1024 * 1024,
//		},
//		{
//			path: "dir3/file31",
//			size: 1024 * 1024,
//		},
//		{
//			path: "dir3/file32",
//			size: 1024 * 1024,
//		},
//		{
//			path: "dir3/file33",
//			size: 1024,
//		},
//		{
//			path:  "dir2/dir4",
//			isDir: true,
//		},
//		{
//			path:  "dir2/dir4/dir5",
//			isDir: true,
//		},
//		{
//			path: "dir2/dir4/file241",
//			size: 5 * 1024 * 1024,
//		},
//		{
//			path: "dir2/dir4/dir5/file2451",
//			size: 10 * 1024 * 1024,
//		},
//	}
//
//	dfsApi := setupFairos(t)
//	_, mntDir, closer := newTestFs(t, dfsApi)
//	defer closer()
//
//	t.Run("create structure", func(t *testing.T) {
//		for idx, v := range entries {
//			if v.isDir {
//				err := os.Mkdir(filepath.Join(mntDir, v.path), 0755)
//				if err != nil {
//					t.Fatal(err)
//				}
//			} else {
//				f, err := os.Create(filepath.Join(mntDir, v.path))
//				if err != nil {
//					t.Fatal(err)
//				}
//				buf := make([]byte, 1024)
//				var off int64 = 0
//				for off < v.size {
//					_, err = rand.Read(buf)
//					if err != nil {
//						t.Fatal(err)
//					}
//					n, err := f.Write(buf)
//					if err != nil {
//						t.Fatal(err)
//					}
//					if n != 1024 {
//						t.Fatalf("wrote %d bytes exp %d", n, 1024)
//					}
//					entries[idx].content = append(entries[idx].content, buf...)
//					off += int64(n)
//				}
//				err = f.Close()
//				if err != nil {
//					t.Fatal(err)
//				}
//			}
//		}
//	})
//
//	verify := func(t *testing.T, mnt string) {
//		t.Helper()
//		for _, v := range entries {
//			st, err := os.Stat(filepath.Join(mnt, v.path))
//			if err != nil {
//				t.Fatal(err)
//			}
//			if st.Mode().IsDir() != v.isDir {
//				t.Fatalf("isDir expected: %t found: %t", v.isDir, st.Mode().IsDir())
//			}
//			if !v.isDir {
//				if st.Size() != v.size {
//					t.Fatalf("expected size %d found %d", v.size, st.Size())
//				}
//				if got, err := ioutil.ReadFile(filepath.Join(mnt, v.path)); err != nil {
//					t.Fatalf("ReadFile: %v", err)
//				} else if !bytes.Equal(got, v.content) {
//					t.Fatalf("ReadFile %s: got %q, want %q", filepath.Join(mnt, v.path), got[:30], v.content[:30])
//				}
//			}
//		}
//	}
//
//	t.Run("verify structure", func(t *testing.T) {
//		verify(t, mntDir)
//	})
//
//	t.Run("fstest", func(t *testing.T) {
//		pathsToFind := []string{
//			"dir1", "dir2", "dir3", "file1", "dir1/file11",
//			//"dir1/file12", "dir3/file31", "dir3/file32", "dir3/file33", "dir2/dir4", "dir2/dir4/dir5",
//			//"dir2/dir4/file241", "dir2/dir4/dir5/file2451",
//		}
//		fuseMount := os.DirFS(mntDir)
//		err := fstest.TestFS(fuseMount, pathsToFind...)
//		if err != nil {
//			t.Fatal(err)
//		}
//	})
//
//	t.Run("iotest on files", func(t *testing.T) {
//		for _, v := range entries {
//			if !v.isDir {
//				f, err := os.Open(filepath.Join(mntDir, v.path))
//				if err != nil {
//					t.Fatal(err)
//				}
//				err = iotest.TestReader(f, v.content)
//				if err != nil {
//					t.Fatal(err)
//				}
//			}
//		}
//	})
//
//	// t.Run("unmount and mount and verify", func(t *testing.T) {
//	// 	closer()
//	// 	time.Sleep(time.Second)
//	// 	_, mntDir, closer, err = newTestFs(st)
//	// 	if err != nil {
//	// 		t.Fatal(err)
//	// 	}
//	// 	time.Sleep(time.Second)
//	// 	verify(t, mntDir)
//	// })
//}

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
