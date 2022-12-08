# Fairdrive Desktop App (FDA)

Fairdrive Desktop App is a FUSE client for fairOS-dfs. It lets you mount your
pod on your own user space and interact with your data. 

## How do I install FDA?

> **_IMPORTANT:_**  To use FDA on your system you need to install [fuse](https://www.kernel.org/doc/html/latest/filesystems/fuse.html) first.

### Install fuse

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

### Install FDA

Download FDA for your operating system

[MacOS (amd64)](https://github.com/datafund/fairos-fuse/releases/download/v0.1.0-rc4/fairdrive_darwin_amd64.dmg)

[MacOS (arm64)](https://github.com/datafund/fairos-fuse/releases/download/v0.1.0-rc4/fairdrive_darwin_arm64.dmg)

[Linux](https://github.com/datafund/fairos-fuse/releases/download/v0.1.0-rc4/fairdrive_linux)

[Windows](https://github.com/datafund/fairos-fuse/releases/download/v0.1.0-rc4/fairdrive_windows.exe)

# How do I configure FDA to connect to a bee node?

![settings](https://user-images.githubusercontent.com/15252513/206389199-bb8eb981-9b5f-4f88-8cdb-e16ec1b676ed.gif)

## FAQ about FDA config
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

#### Which is better, local light node, a full node on raspberry, or gateway?

- Using your own bee is always better for performance. A light node is good enough for using FDA, but a full node will perform better.

#### Where can I follow if the sync is happening?

- If you are using the same bee node for accessing your data, then there is no need to wait for sync. 
Once you create/mode/update/delete data from your mount it will reflect everywhere.


[Bugs and issues](https://github.com/datafund/fairos-fuse/issues)

[Fair Data Society Discord](https://discord.gg/7qFEtJDghM)

[FairOS-dfs](https://github.com/fairDataSociety/fairOS-dfs)

[FairOS-dfs docs](https://docs.fairos.fairdatasociety.org/docs/)


