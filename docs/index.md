# Fairdrive Desktop App (FDA)

[![Release](https://img.shields.io/github/v/release/fairDataSociety/fairdrive-desktop-app?include_prereleases&style=for-the-badge)](https://github.com/fairDataSociety/fairdrive-desktop-app/releases)
![GitHub all releases](https://img.shields.io/github/downloads/fairDataSociety/fairdrive-desktop-app/total?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-windows%20%7C%20macos%20%7C%20linux-green?style=for-the-badge)
[![Workflow](https://img.shields.io/github/actions/workflow/status/fairDataSociety/fairdrive-desktop-app/go.yaml?branch=master&style=for-the-badge)](https://github.com/fairDataSociety/fairdrive-desktop-app/actions)
[![Issues](https://img.shields.io/github/issues-raw/fairDataSociety/fairdrive-desktop-app?style=for-the-badge)](https://github.com/fairDataSociety/fairdrive-desktop-app/issues)
[![Closed](https://img.shields.io/github/issues-closed-raw/fairDataSociety/fairdrive-desktop-app?style=for-the-badge)](https://github.com/fairDataSociety/fairdrive-desktop-app/issues?q=is%3Aissue+is%3Aclosed)
[![PRs](https://img.shields.io/github/issues-pr/fairDataSociety/fairdrive-desktop-app?style=for-the-badge)](https://github.com/fairDataSociety/fairdrive-desktop-app/pulls)
[![PRClosed](https://img.shields.io/github/issues-pr-closed-raw/fairDataSociety/fairdrive-desktop-app?style=for-the-badge)](https://github.com/fairDataSociety/fairdrive-desktop-app/pulls?q=is%3Apr+is%3Aclosed)
![Files](https://img.shields.io/github/directory-file-count/fairDataSociety/fairdrive-desktop-app?style=for-the-badge)
![Go](https://img.shields.io/github/go-mod/go-version/fairDataSociety/fairdrive-desktop-app?style=for-the-badge&logo=go)
[![Discord](https://img.shields.io/discord/888359049551310869?style=for-the-badge&logo=discord)](https://discord.com/invite/KrVTmahcUA)
[![Telegram](https://img.shields.io/badge/-telegram-red?color=86d5f7&logo=telegram&style=for-the-badge)](https://t.me/joinchat/GCEfnpZbpfZgVyoK)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge)](https://opensource.org/licenses/Apache-2.0)

Fairdrive Desktop App is a FUSE client for fairOS-dfs. It lets you mount your
pod on your own user space and interact with your data.

> **_IMPORTANT:_**  FDA is under heavy development and in BETA stage. Some abnormal behaviour, data loss can be observed. We do not recommend parallel usage of same account from multiple installations. Doing so might corrupt your data.

## How do I install FDA?

> **_IMPORTANT:_**  To use FDA on your system you need to install system support for [FUSE](https://www.kernel.org/doc/html/latest/filesystems/fuse.html) first.

## Prerequisites And Requirements

### FUSE

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

##### Installing fuse on Windows
install [winfsp](https://winfsp.dev/rel/)

### BEE
You will need a bee node running with a valid stamp id.

We encourage `Swarm Desktop` for setting up your bee node. Here is a [guide](https://medium.com/ethereum-swarm/upgrading-swarm-deskotp-app-beta-from-an-ultra-light-to-a-light-node-65d52cab7f2c) for it.

### Install FDA

Download FDA for your operating system
from [Releases](https://github.com/fairDataSociety/fairdrive-desktop-app/releases) Page

[MacOS (intel/amd64)](https://github.com/fairDataSociety/fairdrive-desktop-app/releases/download/v0.1.0/fairdrive_darwin_amd64.dmg)

[MacOS (arm64)](https://github.com/fairDataSociety/fairdrive-desktop-app/releases/download/v0.1.0/fairdrive_darwin_arm64.dmg)

[Linux](https://github.com/fairDataSociety/fairdrive-desktop-app/releases/download/v0.1.0/fairdrive_linux)

[Windows](https://github.com/fairDataSociety/fairdrive-desktop-app/releases/download/v0.1.0/fairdrive_windows.exe)

# How do I configure FDA to connect to a bee node?

![settings](https://user-images.githubusercontent.com/15252513/208560029-91046faf-7740-494c-8c84-df1597931001.gif)

## FAQ about FDA preferences/settings
#### `Simple` vs `Advanced` mode

- In `Simple` mode you have to deal with fewer configurations. You do not have to configure any RPC endpoint for portable account.
- `Advanced` mode is for users, who have their own RPC fow ENS based authentication. Users can use [gateway-proxy](https://github.com/ethersphere/gateway-proxy) service with FDA.

> **_NOTE:_**  If you use `Simple` mode you just have to set `bee` api endpoint and `batchID`.

#### "Is bee node running behind proxy?"

- On most of the cases this should be "No" if you are using a bee node directly or using your own bee.
- This option should be "Yes" when you are using the [gateway-proxy](https://github.com/ethersphere/gateway-proxy) service

#### What is "Bee"?

- This should be your bee api endpoint

#### What is "BatchID"?

- It is the stamp that will be user to upload your data into the swarm.

#### What is RPC? Why do we need it?

- An RPC (remote procedure call) endpoint is like a node's address: it's a URL which requests for blockchain data can be sent to.
- We need this for user authentication for our portable account.

#### What is "Network"? Why does it have "Testnet" and "Play"? What is "Play"?

- Choosing this network determines the Ethereum network that will be used for ENS based portable accounts.
- Currently, we only have ENS contract deployed on Goerli Blockchain. That is why "Testnet".
- We have a small play environment for the whole FDP architecture, called [fdp-play](https://github.com/fairDataSociety/fdp-play). If you want to use fdp-play behind FDA, this option is for you.

#### What is "Mount Location"?

- FDA will create a `Fairdrive` directory in your mount location and mount pods in that directory.

## FAQ
#### How to mount?

![mount](https://user-images.githubusercontent.com/15252513/206395147-e9961710-0aa7-49b7-8a9b-a864566c9e83.gif)

- If you have not saved your bee preferences, Go to Files -> Settings and save
- Check "Remember Me" option before Login to save your login credentials. (You can also switch between accounts later if you check this option)
- Login
- After you log in you should see all you pods, if you do not have one hit "ctrl/cmd + N" to create a new pod
- Click on the checkbox on the left of your pod name. The pod should mount in your user space
- Click on the folder icon on the right side of the pod name to open it in your file manager
- CONGRATULATIONS !! you have successfully mounted your fairdrive pod in your user space

#### Which is better, local light node, a full node on raspberry, or gateway?

- Using your own bee is always better for performance. A light node is good enough for using FDA, but a full node will perform better.

#### Where can I follow if the sync is happening?

- If you are using the same bee node for accessing your data, then there is no need to wait for sync.
  Once you create/move/update/delete data from your mount it will reflect everywhere.

#### What is Lite account?

- Lite account exists on local machine only. You can upgrade it to Portable FDS account using mnemonic later. Just enter username/password and new account will be auto-magically created. When logged in see information about it in 'File -> Account details.'

#### What does `File => Accounts` do?

- The accounts you use to log in into FDA are saved locally for your ease of use. You can switch users in just one single click.

> **_Note:_**  Accounts only gets added here if you checked `Remember me` before login

#### I have a `Portable account`. Can I use it alongside `Lite Account` in FDA?

- Yes. If you created your account from the create-account-app, you can log in into id from FDA. FDA internally checks if the user has a portable account. So If you provide
  credentials of a portable account, you log in into that account. But If your user is not registered with a portable account, FDA creates a `Lite` user account and lets you use Fairdrive
  anonymously.

#### Can I use `Lite Account` from other FDA installation or a different system?

- Yes. Just go to `File => Account Details` from where you created the lite account. Copy the mnemonic. Then go to `File => Import Account`, where you what to import the account.

#### Still confused about different account types?

So we have this `Portable` account which can be used to log in from any fdp/fairSO-dfs dapps.
But FDA has a "Special" case where you can create a `Lite` account to store your data without the need of a RPC connection or spending any token for on-boarding.

Lite account can be upgraded to Portable account from our create account app.

#### So basically it's the same account just different data sets?

yes, If you use same the mnemonic to create a portable account your pods and files stay the same as they were in case of lite account.

#### `Lite` accounts are non persistent?

Lite accounts <strong>ARE</strong> persistent in the sense that the pods, files stays on Swarm, but not your user. it currently persists in the current FDA installation.

You can use the mnemonic to access the same account on different FDA installations by importing.

> **_NOTE:_**  `username` and `password` are just placeholders at the moment in case of `Lite` account

[Bugs and issues](https://github.com/fairDataSociety/fairdrive-desktop-app/issues/issues)

[Fair Data Society Discord](https://discord.gg/7qFEtJDghM)

[FairOS-dfs](https://github.com/fairDataSociety/fairOS-dfs)

[FairOS-dfs docs](https://docs.fairos.fairdatasociety.org/docs/)
