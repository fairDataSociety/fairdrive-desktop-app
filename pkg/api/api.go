package api

import (
	"fmt"
	"io"
	"strings"

	"github.com/fairdatasociety/fairOS-dfs/pkg/contracts"
	"github.com/fairdatasociety/fairOS-dfs/pkg/dfs"
	"github.com/fairdatasociety/fairOS-dfs/pkg/dir"
	"github.com/fairdatasociety/fairOS-dfs/pkg/logging"
	"github.com/fairdatasociety/fairOS-dfs/pkg/pod"
)

type DfsAPI struct {
	*dfs.API
	DfsSessionId string
	Pod          *pod.Info
}

type FairOSConfig struct {
	IsProxy bool
	Bee     string
	Batch   string
	RPC     string
	Network string
}

func New(logger logging.Logger, username, password, pod string, fc *FairOSConfig) (*DfsAPI, error) {
	ensConfig := &contracts.Config{}
	switch v := strings.ToLower(fc.Network); v {
	case "mainnet":
		return nil, fmt.Errorf("ens is not available for mainnet yet")
	case "testnet":
		ensConfig = contracts.TestnetConfig()
	case "play":
		ensConfig = contracts.PlayConfig()
	}

	ensConfig.ProviderBackend = fc.RPC
	api, err := dfs.NewDfsAPI(
		"/",
		fc.Bee,
		fc.Batch,
		fc.IsProxy,
		ensConfig,
		logger,
	)
	if err != nil {
		return nil, err
	}
	d := &DfsAPI{
		API: api,
	}
	err = d.Login(username, password)
	if err != nil {
		return nil, err
	}
	err = d.OpenPod(pod, password)
	if err != nil {
		return nil, err
	}

	return d, nil
}

func (d *DfsAPI) Login(username, password string) error {
	ui, _, _, err := d.API.LoginUserV2(username, password, "")
	if err != nil {
		return err
	}
	d.DfsSessionId = ui.GetSessionId()
	return nil
}

func (d *DfsAPI) OpenPod(pod, password string) error {
	pi, err := d.API.OpenPod(pod, password, d.DfsSessionId)
	if err != nil {
		return err
	}

	d.Pod = pi
	return nil
}

func (d *DfsAPI) Inode(path string) (*dir.Inode, error) {
	directory := d.Pod.GetDirectory()
	inode := directory.GetDirFromDirectoryMap(path)
	if inode == nil {
		return nil, fmt.Errorf("dir not found")
	}
	return inode, nil
}

func (d *DfsAPI) WriteAt(path string, update io.Reader, offset uint64, truncate bool) (int, error) {
	file := d.Pod.GetFile()
	return file.WriteAt(path, update, offset, truncate)
}
