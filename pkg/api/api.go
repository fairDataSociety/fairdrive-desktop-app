package api

import (
	"context"
	"fmt"
	"strings"

	"github.com/fairdatasociety/fairOS-dfs/pkg/contracts"
	"github.com/fairdatasociety/fairOS-dfs/pkg/dfs"
	"github.com/fairdatasociety/fairOS-dfs/pkg/logging"
	"github.com/fairdatasociety/fairOS-dfs/pkg/pod"
)

type DfsAPI struct {
	*dfs.API
	logger logging.Logger
}

type FairOSConfig struct {
	IsProxy bool   `json:"isProxy"`
	Bee     string `json:"bee"`
	Batch   string `json:"batch"`
	RPC     string `json:"rpc"`
	Network string `json:"network"`
}

func New(logger logging.Logger, fc *FairOSConfig) (*DfsAPI, error) {
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
	return d, nil
}

// NewMockApi is a mocker.  it is only used in tests
func NewMockApi(logger logging.Logger, api *dfs.API) (*DfsAPI, error) {
	d := &DfsAPI{
		API:    api,
		logger: logger,
	}
	return d, nil
}

func (d *DfsAPI) Login(username, password string) (string, error) {
	ui, _, _, err := d.API.LoginUserV2(username, password, "")
	if err != nil {
		return "", err
	}
	d.logger.Debugf("user %s logged in", username)
	return ui.GetSessionId(), nil
}

func (d *DfsAPI) Load(username, password, mnemonic string) (string, string, error) {
	mnemonic, ui, err := d.API.LoadLiteUser(username, password, mnemonic, "")
	if err != nil {
		return "", "", err
	}
	d.logger.Debugf("user %s logged in", username)
	return mnemonic, ui.GetSessionId(), nil
}

func (d *DfsAPI) GetPodInfo(ctx context.Context, podname, sessionId string, createPod bool) (*pod.Info, error) {
	if createPod {
		return d.API.CreatePod(podname, sessionId)
	}
	return d.API.OpenPodAsync(ctx, podname, sessionId)
}
