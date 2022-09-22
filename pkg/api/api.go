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
	logger       logging.Logger
}

type FairOSConfig struct {
	IsProxy bool
	Bee     string
	Batch   string
	RPC     string
	Network string
}

func New(logger logging.Logger, username, password, pod string, fc *FairOSConfig, createPod bool) (*DfsAPI, error) {
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
		API:    api,
		logger: logger,
	}
	err = d.Login(username, password)
	if err != nil {
		return nil, err
	}
	err = d.GetPodInfo(pod, password, createPod)
	if err != nil {
		return nil, err
	}

	return d, nil
}

// NewMockApi is a mocker.  it is only used in tests
func NewMockApi(logger logging.Logger, username, password, pod string, api *dfs.API, createPod bool) (*DfsAPI, error) {
	d := &DfsAPI{
		API:    api,
		logger: logger,
	}
	err := d.Login(username, password)
	if err != nil {
		return nil, err
	}
	err = d.GetPodInfo(pod, password, createPod)
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
	d.logger.Debugf("user %s logged in", username)
	return nil
}

func (d *DfsAPI) GetPodInfo(podname, password string, createPod bool) error {
	var err error
	if createPod {
		d.Pod, err = d.API.CreatePod(podname, password, d.DfsSessionId)
	} else {
		d.Pod, err = d.API.OpenPod(podname, password, d.DfsSessionId)
	}
	d.logger.Debugf("got pod info of %s", podname)
	return err
}

func (d *DfsAPI) Inode(path string) (*dir.Inode, error) {
	directory := d.Pod.GetDirectory()
	inode := directory.GetDirFromDirectoryMap(path)
	if inode == nil {
		d.logger.Errorf("dir not found: %s", path)
		return nil, fmt.Errorf("dir not found")
	}
	d.logger.Debugf("got dir info %s", path)
	return inode, nil
}

func (d *DfsAPI) WriteAt(path string, update io.Reader, offset uint64, truncate bool) (int, error) {
	d.logger.Debugf("writing to file %s", path)
	file := d.Pod.GetFile()
	return file.WriteAt(path, update, offset, truncate)
}
