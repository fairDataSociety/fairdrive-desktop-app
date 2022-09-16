# Filesystem in USErspace (FUSE) client for fairOS-dfs

fdfs is a FUSE client for fairOS-dfs. It lets you mount your
pod on your own user space and interact with your data.

## Requirements
You need [FUSE](http://github.com/libfuse/libfuse) for your OS.

## Install 
Download fdfs from the release section, or you can clone and build on your own binary by running `make binary`. The binary will be generated in `dist` folder.

You will need a bee node running with a valid stamp id.

## Running
```
$ ./dist/fdfs -h
fdfs is a FUSE client for fairOS-dfs. It lets you mount your 
pod on your own user space and interact with your data.

Usage:
  fdfs [command]

Available Commands:
  completion  Generate the autocompletion script for the specified shell
  help        Help about any command
  mount       Mount a pod into a specified mount point
  version     prints version

Flags:
  -h, --help   help for fdfs
```

You need to run `mount` command to mount a pod
```
$./dist/fdfs mount -h
Mount a pod into a specified mount point

Usage:
  fdfs mount [flags]

Flags:
  -h, --help                help for mount
  -f, --mountpoint string   mountpoint
  -p, --password string     password
  -d, --pod string          pod to mount
  -u, --username string     fdp username
```

`mount` command will automatically detect if you have a config file for fdfs. It will be created on the fly if it is not present in your home folder.

![fdfs](https://user-images.githubusercontent.com/15252513/190614895-bd1a9aff-8bf5-4c47-b747-c042e1adbf61.gif)

After mount is successful, you will be able to see the content of your pod at the given mount-point.

## Dependencies
- [cgofuse](https://github.com/billziss-gh/cgofuse)
- [cobra](github.com/spf13/cobra)
- [fairOS-dfs](github.com/fairdatasociety/fairOS-dfs)
- [promptui](github.com/manifoldco/promptui)