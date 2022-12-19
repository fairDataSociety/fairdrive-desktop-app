# Fairdrive Desktop App
[![Go Report Card](https://goreportcard.com/badge/github.com/fairDataSociety/fairdrive-desktop-app?style=for-the-badge)](https://goreportcard.com/report/github.com/fairDataSociety/fairdrive-desktop-app)
[![Website](https://img.shields.io/badge/website-FAQ-orange?style=for-the-badge)](https://fairdatasociety.github.io/fairdrive-desktop-app/)
![Release](https://img.shields.io/github/v/release/fairDataSociety/fairdrive-desktop-app?include_prereleases&style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-windows%20%7C%20macos%20%7C%20linux-green?style=for-the-badge)
![Workflow](https://img.shields.io/github/actions/workflow/status/fairDataSociety/fairdrive-desktop-app/go.yaml?branch=master&style=for-the-badge)
![Issues](https://img.shields.io/github/issues-raw/fairDataSociety/fairdrive-desktop-app?style=for-the-badge)
![Closed](https://img.shields.io/github/issues-closed-raw/fairDataSociety/fairdrive-desktop-app?style=for-the-badge)
![PRs](https://img.shields.io/github/issues-pr/fairDataSociety/fairdrive-desktop-app?style=for-the-badge)
![PRClosed](https://img.shields.io/github/issues-pr-closed-raw/fairDataSociety/fairdrive-desktop-app?style=for-the-badge)
![Files](https://img.shields.io/github/directory-file-count/fairDataSociety/fairdrive-desktop-app?style=for-the-badge)
![Go](https://img.shields.io/github/go-mod/go-version/fairDataSociety/fairdrive-desktop-app?style=for-the-badge&logo=go)
![Discord](https://img.shields.io/discord/888359049551310869?style=for-the-badge&logo=discord)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge)](https://opensource.org/licenses/Apache-2.0)

Fairdrive Desktop App is a FUSE client for fairOS-dfs. It lets you mount your
pod on your own user space and interact with your data.

## Requirements

#### FUSE

You need [FUSE](http://github.com/libfuse/libfuse) for your OS.

##### Installing fuse on macOS
```
brew install macfuse
```

##### Installing fuse on debian
```
sudo apt-get update
sudo apt-get -qq install libfuse-dev
```

##### Installing fuse on windows
install [winfsp](https://winfsp.dev/rel/)

#### BEE
You will need a bee node running with a valid stamp id.

## Development

#### Requirements

- gcc
- golang installed
- [wails](https://wails.io/docs/gettingstarted/installation#installing-wails)

### Live Development

```
wails dev
```

### Building

```
make binary
```

### Development requirements for windows

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

## Dependencies
- [cgofuse](https://github.com/billziss-gh/cgofuse)
- [cobra](github.com/spf13/cobra)
- [fairOS-dfs](github.com/fairdatasociety/fairOS-dfs)
- [wails.io](https://wails.io/)


## Thanks
This project would not exist without [fairOS-dfs](https://github.com/fairdatasociety/fairOS-dfs) and [bee-afs](https://github.com/aloknerurkar/bee-afs).