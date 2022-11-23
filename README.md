# Filesystem in USErspace (FUSE) client for fairOS-dfs

fdfs is a FUSE client for fairOS-dfs. It lets you mount your
pod on your own user space and interact with your data.

## Requirements
You need [FUSE](http://github.com/libfuse/libfuse) for your OS.

You will need a bee node running with a valid stamp id.
## About

This is the official Wails React-TS template.

You can configure the project by editing `wails.json`. More information about the project settings can be found
here: https://wails.io/docs/reference/project-config

## Live Development

To run in live development mode, run `wails dev` in the project directory. This will run a Vite development
server that will provide very fast hot reload of your frontend changes. If you want to develop in a browser
and have access to your Go methods, there is also a dev server that runs on http://localhost:34115. Connect
to this in your browser, and you can call your Go code from devtools.

## Building

To build a redistributable, production mode package, use `wails build`.

## Dependencies
- [cgofuse](https://github.com/billziss-gh/cgofuse)
- [cobra](github.com/spf13/cobra)
- [fairOS-dfs](github.com/fairdatasociety/fairOS-dfs)
- [promptui](github.com/manifoldco/promptui)


## Building on Windows

### Requirements

#### Tools 
  1.install go

  2.install gcc https://jmeubank.github.io/tdm-gcc/ 

  3.download and install https://winfsp.dev/rel/ and don't forget to check "Developer tools" 

#### Add environment variables

set `CPATH` to `C:\Program Files (x86)\WinFsp\inc\fuse`

set `LIBRARY_PATH` to `C:\Program Files (x86)\WinFsp\lib`

set `CPLUS_INCLUDE_PATH` to `C:\Program Files (x86)\WinFsp\inc\fuse`

#### Problems with npm

Installing frontend dependencies: npm ERR! Unexpected token '.'

This could be a problem to various reasons why your node,npm,nvm installation is corrupt. Probably because you used old nvm (prior to version 1.1.10) which wrongly creates symbolic links. You will have to uninstall nvm and reinstall new node version. 
