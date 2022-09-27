package fuse

import (
	"bytes"
	"crypto/rand"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"testing"
	"testing/fstest"
	"testing/iotest"
	"time"

	"github.com/datafund/fdfs/pkg/api"
	"github.com/fairdatasociety/fairOS-dfs/pkg/blockstore/bee/mock"
	"github.com/fairdatasociety/fairOS-dfs/pkg/dfs"
	mock2 "github.com/fairdatasociety/fairOS-dfs/pkg/ensm/eth/mock"
	"github.com/fairdatasociety/fairOS-dfs/pkg/file"
	"github.com/fairdatasociety/fairOS-dfs/pkg/logging"
	"github.com/fairdatasociety/fairOS-dfs/pkg/user"
	"github.com/plexsysio/taskmanager"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/winfsp/cgofuse/fuse"
)

type dirMap map[string]int64

func setupFairosWithFs(t *testing.T) *api.DfsAPI {
	mockClient := mock.NewMockBeeClient()
	logger := logging.New(os.Stdout, 5)
	ens := mock2.NewMockNamespaceManager()
	tm := taskmanager.New(1, 10, time.Second*15, logger)
	userObject := user.NewUsers("", mockClient, ens, logger)
	password := "password1"
	username := "fdfs"
	_, _, _, _, ui, err := userObject.CreateNewUserV2(username, password, "", "", tm)
	require.NoError(t, err)

	pod1 := ui.GetPod()
	podName1 := "test1"
	pi, err := pod1.CreatePod(podName1, password, "")
	if err != nil {
		t.Fatalf("error creating pod %s : %s", podName1, err.Error())
	}

	dirObject := pi.GetDirectory()
	fileObject := pi.GetFile()
	err = dirObject.MkRootDir(podName1, pi.GetPodAddress(), pi.GetFeed())
	require.NoError(t, err)

	err = dirObject.MkDir("/parentDir")
	require.NoError(t, err)

	err = dirObject.MkDir("/parentDir/subDir1")
	require.NoError(t, err)

	_, err = uploadFile(t, fileObject, "/parentDir", "file1", "", 100, 10)
	require.NoError(t, err)

	err = dirObject.AddEntryToDir("/parentDir", "file1", true)
	require.NoError(t, err)

	_, err = uploadFile(t, fileObject, "/parentDir/subDir1", "file1", "", 100, 10)
	require.NoError(t, err)

	err = dirObject.AddEntryToDir("/parentDir/subDir1", "file1", true)
	require.NoError(t, err)

	mockDfs := dfs.NewMockDfsAPI(mockClient, userObject, logger, "/")
	dfsApi, err := api.NewMockApi(logger, username, password, podName1, mockDfs, false)
	require.NoError(t, err)

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
	require.NoError(t, err)

	pod1 := ui.GetPod()
	podName1 := "test1"
	pi, err := pod1.CreatePod(podName1, password, "")
	if err != nil {
		t.Fatalf("error creating pod %s : %s", podName1, err.Error())
	}

	dirObject := pi.GetDirectory()
	err = dirObject.MkRootDir(podName1, pi.GetPodAddress(), pi.GetFeed())
	require.NoError(t, err)

	mockDfs := dfs.NewMockDfsAPI(mockClient, userObject, logger, "/")
	dfsApi, err := api.NewMockApi(logger, username, password, podName1, mockDfs, false)
	require.NoError(t, err)

	return dfsApi
}

func newTestFs(t *testing.T, dfsApi *api.DfsAPI) (*Ffdfs, string, func()) {
	logger := logging.New(os.Stdout, 5)
	mntDir, err := os.MkdirTemp("", "tmpfuse")
	require.NoError(t, err)

	f := &Ffdfs{
		log: logger,
		api: dfsApi,
	}
	f.openmap = map[uint64]*node_t{}
	f.ongoingWriteSizes = map[string]int64{}
	srv := fuse.NewFileSystemHost(f)
	srv.SetCapReaddirPlus(true)
	sched := make(chan struct{})
	var fuseArgs = []string{"-onoappledouble"}

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

	<-time.After(time.Second)
	files, err := os.ReadDir(mntDir)
	require.NoError(t, err)

	if len(files) != 1 {
		t.Fatal("list failed on root")
	}
	if files[0].Name() != "parentDir" && !files[0].IsDir() {
		t.Fatal("parentDir not fount")
	}

	entries := "parentDir/|parentDir/subDir1/|parentDir/file1:100|parentDir/subDir1/file1:100"
	checkDir(t, mntDir, entries)
}

func TestWrite(t *testing.T) {
	dfsApi := setupFairosWithFs(t)
	_, mntDir, closer := newTestFs(t, dfsApi)
	defer closer()

	fd, err := os.Create(filepath.Join(mntDir, "file1"))
	require.NoError(t, err)

	defer os.Remove(fd.Name())

	if _, err = fd.Write([]byte("check check check")); err != nil {
		t.Fatal(err)
	}

	fd.Close()
	<-time.After(time.Second)
	err = os.WriteFile(filepath.Join(mntDir, "file1"), []byte("asdasd"), 0666)
	require.NoError(t, err)

	fd2, err := os.Open(filepath.Join(mntDir, "file1"))
	require.NoError(t, err)

	data, err := io.ReadAll(fd2)
	require.NoError(t, err)

	fd2.Close()
	if string(data) != "asdasd" {
		t.Fatal("truncate write failed")
	}
}

func TestMultiDirWithFiles(t *testing.T) {
	entries := []struct {
		path    string
		isDir   bool
		size    int64
		content []byte
	}{
		{
			path:  "dir1",
			isDir: true,
		},
		{
			path:  "dir2",
			isDir: true,
		},
		{
			path:  "dir3",
			isDir: true,
		},
		{
			path: "file1",
			size: 1024,
		},
		{
			path: "dir1/file11",
			size: 1024 * 512,
		},
		{
			path: "dir1/file12",
			size: 1024 * 1024,
		},
		{
			path: "dir3/file31",
			size: 1024 * 1024,
		},
		{
			path: "dir3/file32",
			size: 1024 * 1024,
		},
		{
			path: "dir3/file33",
			size: 1024,
		},
		{
			path:  "dir2/dir4",
			isDir: true,
		},
		{
			path:  "dir2/dir4/dir5",
			isDir: true,
		},
		{
			path: "dir2/dir4/file241",
			size: 5 * 1024 * 1024,
		},
		{
			path: "dir2/dir4/dir5/file2451",
			size: 10 * 1024 * 1024,
		},
	}

	dfsApi := setupFairos(t)
	_, mntDir, closer := newTestFs(t, dfsApi)
	defer closer()

	for idx, v := range entries {
		if v.isDir {
			err := os.Mkdir(filepath.Join(mntDir, v.path), 0755)
			require.NoError(t, err)

		} else {
			f, err := os.Create(filepath.Join(mntDir, v.path))
			require.NoError(t, err)

			var off int64 = 0
			for off < v.size {
				buf := make([]byte, 1024)
				_, err = rand.Read(buf)
				require.NoError(t, err)

				n, err := f.Write(buf)
				require.NoError(t, err)

				if n != 1024 {
					t.Fatalf("wrote %d bytes exp %d", n, 1024)
				}
				entries[idx].content = append(entries[idx].content, buf...)
				off += int64(n)
			}
			err = f.Close()
			require.NoError(t, err)

		}
	}

	verify := func(t *testing.T, mnt string) {
		t.Helper()
		for _, v := range entries {
			st, err := os.Stat(filepath.Join(mnt, v.path))
			require.NoError(t, err)

			if st.Mode().IsDir() != v.isDir {
				t.Fatalf("isDir expected: %t found: %t", v.isDir, st.Mode().IsDir())
			}
			if !v.isDir {
				if st.Size() != v.size {
					t.Fatalf("expected size %d found %d", v.size, st.Size())
				}
				if got, err := ioutil.ReadFile(filepath.Join(mnt, v.path)); err != nil {
					t.Fatalf("ReadFile: %v", err)
				} else if !bytes.Equal(got, v.content) {
					t.Fatalf("ReadFile %s: got %q, want %q", filepath.Join(mnt, v.path), got[:30], v.content[:30])
				}
			}
		}
	}

	t.Run("verify structure", func(t *testing.T) {
		verify(t, mntDir)
	})

	t.Run("fstest", func(t *testing.T) {
		pathsToFind := []string{
			"dir1", "dir2", "dir3", "file1", "dir1/file11",
			"dir1/file12", "dir3/file31", "dir3/file32", "dir3/file33", "dir2/dir4", "dir2/dir4/dir5",
			"dir2/dir4/file241", "dir2/dir4/dir5/file2451",
		}
		fuseMount := os.DirFS(mntDir)
		err := fstest.TestFS(fuseMount, pathsToFind...)
		require.NoError(t, err)

	})

	t.Run("iotest on files", func(t *testing.T) {
		for _, v := range entries {
			if !v.isDir {
				f, err := os.Open(filepath.Join(mntDir, v.path))
				require.NoError(t, err)

				err = iotest.TestReader(f, v.content)
				require.NoError(t, err)

			}
		}
	})

	//t.Run("unmount and mount and verify", func(t *testing.T) {
	//	closer()
	//	time.Sleep(time.Second)
	//	_, mntDir, closer, err = newTestFs(st)
	//	if err != nil {
	//		t.Fatal(err)
	//	}
	//	time.Sleep(time.Second)
	//	verify(t, mntDir)
	//})
}

func TestRCloneTests(t *testing.T) {
	dfsApi := setupFairos(t)
	_, mntDir, closer := newTestFs(t, dfsApi)
	defer closer()

	t.Run("touch and delete", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		path := filepath.Join(runDir, "touched")
		err = writeFile(path, []byte(""), 0600)
		require.NoError(t, err)

		err = os.Remove(path)
		require.NoError(t, err)

		// Wait for file to disappear from listing
		deleted := false
		for i := 0; i < 100; i++ {
			_, err := os.Stat(path)
			if os.IsNotExist(err) {
				deleted = true
				break
			}
			time.Sleep(100 * time.Millisecond)
		}
		if !deleted {
			t.Fatal("failed to delete file")
		}

		localDm := make(dirMap)
		readLocal(t, localDm, runDir)
		if len(localDm) != 0 {
			t.Fatal("delete failed")
		}
	})

	t.Run("rename and open", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		example := []byte("Some Data")
		path := filepath.Join(runDir, "rename")
		f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0666)
		require.NoError(t, err)

		_, err = f.Write(example)
		require.NoError(t, err)

		err = f.Close()
		require.NoError(t, err)

		err = os.Rename(path, path+"bla")
		require.NoError(t, err)

		localDm := make(dirMap)
		readLocal(t, localDm, runDir)

		if len(localDm) != 1 {
			t.Fatal("rename failed")
		}
		size, ok := localDm[path+"bla"]
		if !ok {
			t.Fatal("rename failed")
		}
		if size != int64(len(example)) {
			t.Fatal("content mismatch")
		}

		err = os.Remove(path + "bla")
		require.NoError(t, err)

		// Wait for file to disappear from listing
		deleted := false
		for i := 0; i < 100; i++ {
			_, err := os.Stat(filepath.Join(runDir, "renameble"))
			if os.IsNotExist(err) {
				deleted = true
				break
			}
			time.Sleep(100 * time.Millisecond)
		}
		if !deleted {
			t.Fatal("failed to delete file")
		}

		localDm = make(dirMap)
		readLocal(t, localDm, runDir)
		if len(localDm) != 0 {
			t.Fatal("delete failed")
		}
	})

	t.Run("dir ls", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		dirPath := filepath.Join(runDir, "a directory")
		err = os.Mkdir(dirPath, 0777)
		require.NoError(t, err)

		path := filepath.Join(runDir, "a file")
		err = writeFile(path, []byte("hello"), 0600)
		require.NoError(t, err)

		entries := "a directory/|a file:5"
		checkDir(t, runDir, entries)
	})

	t.Run("dir create and remove", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		dirPath := filepath.Join(runDir, "dir")
		err = os.Mkdir(dirPath, 0777)
		require.NoError(t, err)

		subDir := filepath.Join(dirPath, "subdir")
		err = os.Mkdir(subDir, 0777)
		require.NoError(t, err)

		entries := "dir/|dir/subdir/"
		checkDir(t, runDir, entries)
	})

	t.Run("dir create and remove file", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		dirPath := filepath.Join(runDir, "dir")
		err = os.Mkdir(dirPath, 0777)
		require.NoError(t, err)

		path := filepath.Join(dirPath, "file")
		err = writeFile(path, []byte("potato"), 0600)
		require.NoError(t, err)

		entries := "dir/|dir/file:6"
		checkDir(t, runDir, entries)
	})

	t.Run("dir rename file", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		dirPath := filepath.Join(runDir, "dir")
		err = os.Mkdir(dirPath, 0777)
		require.NoError(t, err)

		path := filepath.Join(dirPath, "file")
		err = writeFile(path, []byte("potato"), 0600)
		require.NoError(t, err)

		entries := "dir/|dir/file:6"
		checkDir(t, runDir, entries)
		path2 := path + "2"
		err = os.Rename(path, path2)
		if err != nil {
			t.Fatal(err)
		}

		entries = "dir/|dir/file2:6"
		checkDir(t, runDir, entries)
		path3 := path + "3"
		err = os.Rename(path2, path3)
		require.NoError(t, err)

		entries = "dir/|dir/file3:6"
		checkDir(t, runDir, entries)
	})

	t.Run("rename empty dir", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		dirPath := filepath.Join(runDir, "dir")
		err = os.Mkdir(dirPath, 0777)
		require.NoError(t, err)

		dirPath1 := filepath.Join(runDir, "dir1")
		err = os.Mkdir(dirPath1, 0777)
		if err != nil {
			t.Fatal(err)
		}

		path := filepath.Join(dirPath1, "potato.txt")
		err = writeFile(path, []byte("maris piper"), 0600)
		require.NoError(t, err)

		entries := "dir/|dir1/|dir1/potato.txt:11"
		checkDir(t, runDir, entries)

		path2 := filepath.Join(runDir, "dir/dir2")
		err = os.Rename(dirPath1, path2)
		require.NoError(t, err)

		entries = "dir/|dir/dir2/|dir/dir2/potato.txt:11"
		checkDir(t, runDir, entries)

		path3 := filepath.Join(runDir, "dir/dir3")
		err = os.Rename(path2, path3)
		require.NoError(t, err)

		entries = "dir/|dir/dir3/|dir/dir3/potato.txt:11"
		checkDir(t, runDir, entries)
	})

	t.Run("rename full dir", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		dirPath := filepath.Join(runDir, "dir")
		err = os.Mkdir(dirPath, 0777)
		require.NoError(t, err)

		dirPath1 := filepath.Join(runDir, "dir1")
		err = os.Mkdir(dirPath1, 0777)
		require.NoError(t, err)

		entries := "dir/|dir1/"
		checkDir(t, runDir, entries)

		path2 := filepath.Join(runDir, "dir/dir2")
		err = os.Rename(dirPath1, path2)
		require.NoError(t, err)

		entries = "dir/|dir/dir2/"
		checkDir(t, runDir, entries)

		path3 := filepath.Join(runDir, "dir/dir3")
		err = os.Rename(path2, path3)
		require.NoError(t, err)

		entries = "dir/|dir/dir3/"
		checkDir(t, runDir, entries)
	})

	// TODO fix Chtimes
	//t.Run("dir mod time", func(t *testing.T) {
	//	runDir := filepath.Join(mntDir, "runDir")
	//	err := os.Mkdir(runDir, 0777)
	//	require.NoError(t, err)
	//
	//	defer os.RemoveAll(runDir)
	//
	//	dirPath := filepath.Join(runDir, "dir")
	//	err = os.Mkdir(dirPath, 0777)
	//	require.NoError(t, err)
	//
	//	mtime := time.Date(2012, time.November, 18, 17, 32, 31, 0, time.UTC)
	//	err = os.Chtimes(dirPath, mtime, mtime)
	//	require.NoError(t, err)
	//
	//	info, err := os.Stat(dirPath)
	//	require.NoError(t, err)
	//	// avoid errors because of timezone differences
	//	assert.Equal(t, info.ModTime().Unix(), mtime.Unix())
	//})

	// TODO fix Chtimes
	//t.Run("file mod time", func(t *testing.T) {
	//	runDir := filepath.Join(mntDir, "runDir")
	//	err := os.Mkdir(runDir, 0777)
	//	require.NoError(t, err)
	//
	//	defer os.RemoveAll(runDir)
	//
	//	path := filepath.Join(runDir, "potato.txt")
	//	err = writeFile(path, []byte("123"), 0600)
	//	if err != nil {
	//		t.Fatal(err)
	//	}
	//
	//	mtime := time.Date(2012, time.November, 18, 17, 32, 31, 0, time.UTC)
	//	err = os.Chtimes(path, mtime, mtime)
	//	require.NoError(t, err)
	//
	//	info, err := os.Stat(path)
	//	require.NoError(t, err)
	//	// avoid errors because of timezone differences
	//	assert.Equal(t, info.ModTime().Unix(), mtime.Unix())
	//})

	t.Run("read by byte", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		var data = []byte("hellohello")
		path := filepath.Join(runDir, "testfile")
		err = writeFile(path, data, 0600)
		require.NoError(t, err)

		entries := "testfile:10"
		checkDir(t, runDir, entries)

		for i := 0; i < len(data); i++ {
			fd, err := os.Open(path)
			assert.NoError(t, err)
			for j := 0; j < i; j++ {
				buf := make([]byte, 1)
				n, err := io.ReadFull(fd, buf)
				assert.NoError(t, err)
				assert.Equal(t, 1, n)
				assert.Equal(t, buf[0], data[j])
			}
			err = fd.Close()
			assert.NoError(t, err)
		}
	})

	t.Run("read checksum", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		b := make([]rune, 3*128*1024)
		for i := range b {
			b[i] = 'r'
		}

		path := filepath.Join(runDir, "bigfile")
		err = writeFile(path, []byte(string(b)), 0600)
		require.NoError(t, err)

		// The hash comparison would fail in Flush, if we did not
		// ensure we read the whole file
		fd, err := os.Open(path)
		assert.NoError(t, err)
		buf := make([]byte, 10)
		_, err = io.ReadFull(fd, buf)
		assert.NoError(t, err)
		err = fd.Close()
		assert.NoError(t, err)

		// The hash comparison would fail, because we only read parts
		// of the file
		fd, err = os.Open(path)
		assert.NoError(t, err)
		// read at start
		_, err = io.ReadFull(fd, buf)
		assert.NoError(t, err)
		// read at end
		_, err = fd.Seek(int64(len(b)-len(buf)), io.SeekStart)
		assert.NoError(t, err)
		_, err = io.ReadFull(fd, buf)
		assert.NoError(t, err)
		// ensure we don't compare hashes
		err = fd.Close()
		assert.NoError(t, err)
	})

	t.Run("read double close", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		path := filepath.Join(runDir, "testdoubleclose")
		err = writeFile(path, []byte("hello"), 0600)
		require.NoError(t, err)

		in, err := os.Open(path)
		assert.NoError(t, err)
		fd := in.Fd()

		fd1, err := syscall.Dup(int(fd))
		assert.NoError(t, err)

		fd2, err := syscall.Dup(int(fd))
		assert.NoError(t, err)

		// close one of the dups - should produce no error
		err = syscall.Close(fd1)
		assert.NoError(t, err)

		// read from the file
		buf := make([]byte, 1)
		_, err = in.Read(buf)
		assert.NoError(t, err)

		// close it
		err = in.Close()
		assert.NoError(t, err)

		// read from the other dup - should produce no error as this
		// file is now buffered
		n, err := syscall.Read(fd2, buf)
		assert.NoError(t, err)
		assert.Equal(t, 1, n)

		// close the dup - should not produce an error
		err = syscall.Close(fd2)
		assert.NoError(t, err, "input/output error")
	})

	t.Run("read seek", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		path := filepath.Join(runDir, "testfile")
		err = writeFile(path, []byte("helloHELLO"), 0600)
		require.NoError(t, err)

		entries := "testfile:10"
		checkDir(t, runDir, entries)

		fd, err := os.Open(path)
		assert.NoError(t, err)

		// Seek to half way
		_, err = fd.Seek(5, io.SeekStart)
		assert.NoError(t, err)

		buf, err := ioutil.ReadAll(fd)
		assert.NoError(t, err)
		assert.Equal(t, buf, []byte("HELLO"))

		// Test seeking to the end
		_, err = fd.Seek(10, io.SeekStart)
		assert.NoError(t, err)

		buf, err = ioutil.ReadAll(fd)
		assert.NoError(t, err)
		assert.Equal(t, buf, []byte(""))

		// Test seeking beyond the end
		_, err = fd.Seek(1000000, io.SeekStart)
		assert.NoError(t, err)

		buf, err = ioutil.ReadAll(fd)
		assert.NoError(t, err)
		assert.Equal(t, buf, []byte(""))

		// Now back to the start
		_, err = fd.Seek(0, io.SeekStart)
		assert.NoError(t, err)

		buf, err = ioutil.ReadAll(fd)
		assert.NoError(t, err)
		assert.Equal(t, buf, []byte("helloHELLO"))

		err = fd.Close()
		assert.NoError(t, err)
	})

	t.Run("file empty", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		path := filepath.Join(runDir, "testnowrite")
		fd, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0666)
		assert.NoError(t, err)

		err = fd.Close()
		assert.NoError(t, err)

		entries := "testnowrite:0"
		checkDir(t, runDir, entries)
	})

	t.Run("file write", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		path := filepath.Join(runDir, "testwrite")
		err = writeFile(path, []byte("data"), 0600)
		assert.NoError(t, err)

		entries := "testwrite:4"
		checkDir(t, runDir, entries)

		contents, err := os.ReadFile(path)
		assert.NoError(t, err)

		assert.Equal(t, "data", string(contents))
	})

	t.Run("file overwrite", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		path := filepath.Join(runDir, "testwrite")
		err = writeFile(path, []byte("data"), 0600)
		assert.NoError(t, err)

		entries := "testwrite:4"
		checkDir(t, runDir, entries)

		err = writeFile(path, []byte("potato"), 0600)
		assert.NoError(t, err)

		contents, err := os.ReadFile(path)
		assert.NoError(t, err)

		assert.Equal(t, "potato", string(contents))
	})

	t.Run("file fsync", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		path := filepath.Join(runDir, "to be synced")
		fd, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0666)
		assert.NoError(t, err)
		require.NoError(t, err)
		_, err = fd.Write([]byte("hello"))
		require.NoError(t, err)
		err = fd.Sync()
		require.NoError(t, err)
		err = fd.Close()
		require.NoError(t, err)
	})

	t.Run("file append", func(t *testing.T) {
		runDir := filepath.Join(mntDir, "runDir")
		err := os.Mkdir(runDir, 0777)
		require.NoError(t, err)

		defer os.RemoveAll(runDir)

		path := filepath.Join(runDir, "to be synced")
		fh, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0666)
		assert.NoError(t, err)
		require.NoError(t, err)

		testData := []byte("0123456789")
		appendData := []byte("10")

		_, err = fh.Write(testData)
		require.NoError(t, err)

		err = fh.Close()
		require.NoError(t, err)

		fh, err = os.OpenFile(path, os.O_WRONLY|os.O_APPEND, 0666)
		require.NoError(t, err)

		_, err = fh.Write(appendData)
		require.NoError(t, err)

		err = fh.Close()
		require.NoError(t, err)

		info, err := os.Stat(path)
		require.NoError(t, err)
		require.EqualValues(t, len(testData)+len(appendData), info.Size())
	})

	t.Run("test root", func(t *testing.T) {
		fi, err := os.Lstat(mntDir)
		require.NoError(t, err)
		assert.True(t, fi.IsDir())
		assert.Equal(t, os.FileMode(0777)&os.ModePerm, fi.Mode().Perm())
	})
}

// checkDir the dir entries
func checkDir(t *testing.T, filePath, entries string) {
	localDm := make(dirMap)
	readLocal(t, localDm, filePath)
	dm := newDirMap(filePath, entries)
	if len(localDm) != len(dm) {
		t.Fatal("checkDir failed")
	}
	for i, v := range localDm {

		size, ok := dm[i]
		if !ok {
			t.Fatal("checkDir failed: entry not found", i)
		}
		t.Log(i, v, size)

		if v != size {
			t.Fatal("checkDir failed: size mismatch", i)
		}
	}
}

// reads the local tree into dir
func readLocal(t *testing.T, dir dirMap, filePath string) {
	files, err := os.ReadDir(filePath)
	require.NoError(t, err)

	require.NoError(t, err)
	for _, fi := range files {
		name := filepath.Join(filePath, fi.Name())
		fileinfo, err := os.Lstat(name)
		require.NoError(t, err)

		if fi.IsDir() {
			dir[name] = 0
			readLocal(t, dir, name)
			fi.Info()
			assert.Equal(t, os.FileMode(0777)&os.ModePerm, fileinfo.Mode().Perm())
		} else {
			dir[fmt.Sprintf("%s", name)] = fileinfo.Size()
			assert.Equal(t, os.FileMode(0666)&os.ModePerm, fileinfo.Mode().Perm())
		}
	}
}

// Create a dirMap from a string
func newDirMap(base, dirString string) (dm dirMap) {
	dm = make(dirMap)
	for _, entry := range strings.Split(dirString, "|") {
		if strings.HasSuffix(entry, "/") {
			dm[filepath.Join(base, entry)] = 0
		} else {
			fEntries := strings.Split(entry, ":")
			s, err := strconv.Atoi(fEntries[1])
			if err == nil {
				dm[filepath.Join(base, fEntries[0])] = int64(s)
			}
		}
	}
	return dm
}

// Returns a dirmap with only the files in
func (dm dirMap) filesOnly() dirMap {
	newDm := make(dirMap)
	for name := range dm {
		if !strings.HasSuffix(name, "/") {
			newDm[name] = 0
		}
	}
	return newDm
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

func writeFile(filename string, data []byte, perm os.FileMode) error {
	f, err := os.OpenFile(filename, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, perm)
	if err != nil {
		err = os.Remove(filename)
		if err != nil {
			return err
		}
		f, err = os.OpenFile(filename, os.O_WRONLY|os.O_CREATE, perm)
		if err != nil {
			return err
		}
	}
	n, err := f.Write(data)
	if err == nil && n < len(data) {
		err = io.ErrShortWrite
	}
	if err1 := f.Close(); err == nil {
		err = err1
	}
	return err
}
