package main

import (
	"context"
	"embed"
	"fmt"
	"os"
	"runtime"

	"github.com/datafund/fdfs/pkg/handler"
	"github.com/fairdatasociety/fairOS-dfs/pkg/logging"
	"github.com/wailsapp/wails/v2/pkg/application"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	wRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	logger := logging.New(os.Stdout, 5)
	dfsHandler, err := handler.New(logger)
	if err != nil {
		println("Error:", err.Error())
	}
	cnf := &conf{}
	acc := NewAccount()
	var startContext context.Context
	// Create application with options
	app := application.NewWithOptions(&options.App{
		Title:         "app",
		Width:         375,
		Height:        667,
		DisableResize: true,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		Bind: []interface{}{
			dfsHandler,
			cnf,
			acc,
		},
		OnStartup: func(ctx context.Context) {
			startContext = ctx
			err := cnf.ReadConfig()
			if err != nil {
				println("read config failed ", err.Error())
			}
			c := cnf.GetConfig()
			fmt.Println(cnf.IsSet())
			if c == nil {
				return
			}
			err = dfsHandler.Start(c)
			if err != nil {
				println("failed to start on startup ", err.Error())
			}
		},
		OnShutdown: func(_ context.Context) {
			dfsHandler.Close()
		},
	})
	appMenu := menu.NewMenu()
	fileMenu := appMenu.AddSubmenu("File")

	if runtime.GOOS == "darwin" {
		fileMenu.AddText("Preferences", keys.CmdOrCtrl(","), func(_ *menu.CallbackData) {
			wRuntime.EventsEmit(startContext, "preferences")
		})
		fileMenu.AddSeparator()
		appMenu.Append(menu.EditMenu()) // on macos platform, we should append EditMenu to enable Cmd+C,Cmd+V,Cmd+Z... shortcut
	}
	fileMenu.AddText("Quit", keys.CmdOrCtrl("q"), func(_ *menu.CallbackData) {
		app.Quit()
	})
	app.SetApplicationMenu(appMenu)

	if err := app.Run(); err != nil {
		println("Error:", err.Error())
	}
}