package main

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/datafund/fdfs/pkg/api"
	"github.com/mitchellh/go-homedir"
	"github.com/spf13/viper"
)

type conf struct {
	fc *api.FairOSConfig
}

func (c *conf) SetupConfig(beeEndpoint, beeBatch, network, rpc string, beeGatewayBool bool) error {
	config := viper.New()

	config.Set("bee.endpoint", beeEndpoint)
	config.Set("bee.batch", beeBatch)
	config.Set("bee.gateway", beeGatewayBool)
	config.Set("network", network)
	config.Set("rpc", rpc)
	home, err := homedir.Dir()
	if err != nil {
		return err
	}
	cfgFile := filepath.Join(home, ".fdfs.yaml")
	return config.WriteConfigAs(cfgFile)
}

func (c *conf) ReadConfig() error {
	config := viper.New()
	home, err := homedir.Dir()
	if err != nil {
		return err

	}
	cfgFile := filepath.Join(home, ".fdfs.yaml")
	if _, err := os.Stat(cfgFile); err != nil {
		return fmt.Errorf("config not found")
	} else {
		config.SetConfigFile(cfgFile)
		if err := config.ReadInConfig(); err != nil {
			return err
		}
	}
	c.fc = &api.FairOSConfig{
		IsProxy: config.GetBool("bee.gateway"),
		Bee:     config.GetString("bee.endpoint"),
		Batch:   config.GetString("bee.batch"),
		RPC:     config.GetString("rpc"),
		Network: config.GetString("network"),
	}
	return nil
}

func (c *conf) GetConfig() *api.FairOSConfig {
	return c.fc
}

func (c *conf) IsSet() bool {
	return c.fc != nil
}
