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
	Bee     string `json:"bee"`
	Batch   string `json:"batch"`
	RPC     string `json:"rpc"`
	Network string `json:"network"`
}

func New(logger logging.Logger, fc *FairOSConfig) (*DfsAPI, error) {
	var (
		ensConfig     *contracts.ENSConfig
		datahubConfig *contracts.SubscriptionConfig
	)
	switch v := strings.ToLower(fc.Network); v {
	case "mainnet":
		return nil, fmt.Errorf("ens is not available for mainnet yet")
	case "testnet":
		ensConfig, datahubConfig = contracts.TestnetConfig(contracts.Sepolia)
		datahubConfig.RPC = fc.RPC
	case "play":
		ensConfig, _ = contracts.PlayConfig()
	}

	ensConfig.ProviderBackend = fc.RPC

	api, err := dfs.NewDfsAPI(
		context.TODO(),
		&dfs.Options{
			BeeApiEndpoint:     fc.Bee,
			Stamp:              fc.Batch,
			EnsConfig:          ensConfig,
			SubscriptionConfig: datahubConfig,
			Logger:             logger,
			FeedCacheSize:      -1,
		},
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
	lr, err := d.API.LoginUserV2(username, password, "")
	if err != nil {
		return "", err
	}
	d.logger.Debugf("user %s logged in", username)
	return lr.UserInfo.GetSessionId(), nil
}

func (d *DfsAPI) Load(username, password, mnemonic string) (string, string, string, error) {
	mnemonic, privateKey, ui, err := d.API.LoadLiteUser(username, password, mnemonic, "")
	if err != nil {
		return "", "", "", err
	}
	d.logger.Debugf("user %s logged in", username)
	return mnemonic, privateKey, ui.GetSessionId(), nil
}

func (d *DfsAPI) GetPodInfo(podname, sessionId string, createPod bool) (*pod.Info, error) {
	if createPod {
		return d.API.CreatePod(podname, sessionId)
	}
	return d.API.OpenPod(podname, sessionId)
}
