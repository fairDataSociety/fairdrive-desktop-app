package dfs

import (
	"fmt"

	"github.com/datafund/fdfs"
	"github.com/spf13/cobra"
)

// versionCmd shows the version of dfs
var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "prints version",
	Long:  `Shows the version of fdfs.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(fdfs.Version)
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}
