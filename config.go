package main

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/fairdatasociety/fairdrive-desktop-app/pkg/api"
	"github.com/mitchellh/go-homedir"
	"github.com/spf13/viper"
)

const (
	settings = ".fda.yaml"
)

type conf struct {
	fc          *api.FairOSConfig
	mountPoint  string
	autoMount   bool
	mountedPods []string
}

func (c *conf) SetupConfig(beeEndpoint, beeBatch, network, rpc, mountPoint string, beeGatewayBool bool) error {
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
	if mountPoint == "" {
		mountPoint = home
	}
	config.Set("mountPoint", mountPoint)
	cfgFile := filepath.Join(home, settings)
	return config.WriteConfigAs(cfgFile)
}

func (c *conf) ReadConfig() error {
	config := viper.New()
	home, err := homedir.Dir()
	if err != nil {
		return err
	}
	cfgFile := filepath.Join(home, settings)
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
	c.mountPoint = config.GetString("mountPoint")
	c.autoMount = config.GetBool("autoMount")
	c.mountedPods = config.GetStringSlice("mountedPods")
	return nil
}

func (c *conf) GetConfig() *api.FairOSConfig {
	return c.fc
}

func (c *conf) GetMountPoint() string {
	return c.mountPoint
}

func (c *conf) GetAutoMount() bool {
	return c.autoMount
}

func (c *conf) GetMountedPods() []string {
	return c.mountedPods
}

func (c *conf) setMountedPods(pods []string) error {
	config := viper.New()
	home, err := homedir.Dir()
	if err != nil {
		return err
	}
	cfgFile := filepath.Join(home, settings)
	if _, err := os.Stat(cfgFile); err != nil {
		return fmt.Errorf("config not found")
	} else {
		config.SetConfigFile(cfgFile)
		if err := config.ReadInConfig(); err != nil {
			return err
		}
	}
	if c.autoMount {
		c.mountedPods = pods
		config.Set("mountedPods", c.mountedPods)
		return config.WriteConfig()
	}
	return nil
}

//func (c *conf) setAutomount(isChecked bool) error {
//	config := viper.New()
//	home, err := homedir.Dir()
//	if err != nil {
//		return err
//	}
//	cfgFile := filepath.Join(home, settings)
//	if _, err := os.Stat(cfgFile); err != nil {
//		return fmt.Errorf("config not found")
//	} else {
//		config.SetConfigFile(cfgFile)
//		if err := config.ReadInConfig(); err != nil {
//			return err
//		}
//	}
//	c.autoMount = isChecked
//	config.Set("autoMount", c.autoMount)
//	return config.WriteConfig()
//}

func (c *conf) IsSet() bool {
	return c.fc != nil
}
