package dfs

import (
	"fmt"
	"os"
	"strings"

	"github.com/datafund/fdfs/pkg/api"
	dfuse "github.com/datafund/fdfs/pkg/fuse"
	"github.com/manifoldco/promptui"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
	"github.com/winfsp/cgofuse/fuse"
)

var (
	optionVerbosity         = "verbosity"
	optionBeeApi            = "bee.endpoint"
	optionBeePostageBatchId = "bee.batch"
	optionIsGatewayProxy    = "bee.gateway"
	optionNetwork           = "network"
	optionRPC               = "rpc"

	defaultVerbosity = "trace"

	username   string
	password   string
	pod        string
	createPod  bool
	mountpoint string
)

var mountCmd = &cobra.Command{
	Use:   "mount",
	Short: "Mount a pod into a specified mount point",
	PreRunE: func(cmd *cobra.Command, args []string) error {
		if username == "" {
			return fmt.Errorf("plesae provide a username")
		}
		if password == "" {
			return fmt.Errorf("plesae provide password")
		}
		if pod == "" {
			return fmt.Errorf("plesae provide a pod name")
		}
		if mountpoint == "" {
			return fmt.Errorf("plesae provide a mountpoint")
		}
		return nil
	},
	RunE: func(cmd *cobra.Command, args []string) (err error) {
		fmt.Println(message)
		fmt.Println()
		fmt.Println(cfgFile)
		if _, err := os.Stat(cfgFile); err != nil {
			// if there is no configFile, write it
			err = setupConfig()
			if err != nil {
				return err
			}
		} else {
			config.SetConfigFile(cfgFile)
			if err := config.ReadInConfig(); err != nil {
				return err
			}
		}
		fc := &api.FairOSConfig{
			IsProxy: config.GetBool(optionIsGatewayProxy),
			Bee:     config.GetString(optionBeeApi),
			Batch:   config.GetString(optionBeePostageBatchId),
			RPC:     config.GetString(optionRPC),
			Network: config.GetString(optionNetwork),
		}
		verbosity := config.GetString(optionVerbosity)
		var level logrus.Level
		switch v := strings.ToLower(verbosity); v {
		case "0", "silent":
			level = 0
		case "1", "error":
			level = logrus.ErrorLevel
		case "2", "warn":
			level = logrus.WarnLevel
		case "3", "info":
			level = logrus.InfoLevel
		case "4", "debug":
			level = logrus.DebugLevel
		case "5", "trace":
			level = logrus.TraceLevel
		default:
			fmt.Println("unknown verbosity level", v)
			return fmt.Errorf("unknown verbosity level")
		}
		dfsFuse, err := dfuse.New(username, password, pod, level, fc, createPod)
		if err != nil {
			return err
		}
		host := fuse.NewFileSystemHost(dfsFuse)
		defer host.Unmount()
		fmt.Printf("%s is accessable at %s\n", pod, mountpoint)
		host.Mount("", []string{mountpoint})
		return nil
	},
}

func init() {
	mountCmd.Flags().StringVarP(&username, "username", "u", "", "fdp username")
	mountCmd.Flags().StringVarP(&password, "password", "p", "", "password")
	mountCmd.Flags().StringVarP(&pod, "pod", "d", "", "pod to mount")
	mountCmd.Flags().BoolVarP(&createPod, "create", "c", false, "create the pod with provided name")
	mountCmd.Flags().StringVarP(&mountpoint, "mountpoint", "f", "", "mountpoint")
	rootCmd.AddCommand(mountCmd)
}

func setupConfig() error {
	promptEndpoint := promptui.Prompt{
		Label: "Bee Endpoint",
	}
	beeEndpoint, err := promptEndpoint.Run()
	if err != nil {
		return err
	}

	promptGateway := promptui.Select{
		Label: "Are you using gateway proxy (https://github.com/ethersphere/gateway-proxy)?",
		Items: []string{"Yes", "No"},
	}
	_, beeGateway, err := promptGateway.Run()
	if err != nil {
		return err
	}
	beeGatewayBool := false
	if beeGateway == "Yes" {
		beeGatewayBool = true
	}
	// TODO check beeEndpoint is reachable
	beeBatch := ""
	if beeGateway == "No" {
		promptBatch := promptui.Prompt{
			Label: "Batch ",
		}
		beeBatch, err = promptBatch.Run()
		if err != nil {
			return err
		}
		// TODO check batch validity as a string
	}

	promptNetwork := promptui.Select{
		Label: "Select Network",
		Items: []string{"Play", "Testnet"},
	}
	_, network, err := promptNetwork.Run()
	if err != nil {
		return err
	}
	promptRPC := promptui.Prompt{
		Label: "RPC Endpoint",
	}
	rpc, err := promptRPC.Run()
	if err != nil {
		return err
	}

	// TODO check RPC connection
	config.Set(optionVerbosity, defaultVerbosity)
	config.Set(optionBeeApi, beeEndpoint)
	config.Set(optionBeePostageBatchId, beeBatch)
	config.Set(optionIsGatewayProxy, beeGatewayBool)
	config.Set(optionNetwork, network)
	config.Set(optionRPC, rpc)

	if err := config.WriteConfigAs(cfgFile); err != nil {
		return err
	}
	return nil
}
