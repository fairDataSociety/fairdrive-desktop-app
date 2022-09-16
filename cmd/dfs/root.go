package dfs

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/mitchellh/go-homedir"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	defaultConfig = ".fdfs.yaml"

	cfgFile string
	config  = viper.New()

	message = `
  ______       __   ______          
 /      \     /  | /      \         
/$$$$$$  |____$$ |/$$$$$$  |_______ 
$$ |_ $$//    $$ |$$ |_ $$//       |
$$   |  /$$$$$$$ |$$   |  /$$$$$$$/ 
$$$$/   $$ |  $$ |$$$$/   $$      \ 
$$ |    $$ \__$$ |$$ |     $$$$$$  |
$$ |    $$    $$ |$$ |    /     $$/ 
$$/      $$$$$$$/ $$/     $$$$$$$/`
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "fdfs",
	Short: "Filesystem in USErspace (FUSE) client for fairO-dfs",
	Long: `fdfs is a FUSE client for fairOS-dfs. It lets you mount your 
pod on your own user space and interact with your data.`,
}

// Execute is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func init() {
	home, err := homedir.Dir()
	if err != nil {
		os.Exit(1)
	}
	cfgFile = filepath.Join(home, defaultConfig)
}
