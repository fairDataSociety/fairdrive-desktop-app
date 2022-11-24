package main

import (
	"context"
	"embed"
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

var (
	//go:embed all:frontend/dist
	assets embed.FS
)

func main() {

	logger := logging.New(os.Stdout, 5)
	dfsHandler, err := handler.New(logger)
	if err != nil {
		println("Error:", err.Error())
		return
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
				return
			}
		},
		OnShutdown: func(_ context.Context) {
			dfsHandler.Close()
		},
	})
	appMenu := menu.NewMenu()
	fileMenu := appMenu.AddSubmenu("File")

	prefShortcut := keys.CmdOrCtrl(",")
	if runtime.GOOS == "windows" {
		prefShortcut = keys.Combo(",", keys.CmdOrCtrlKey, keys.ShiftKey)
	}
	fileMenu.AddText("Preferences", prefShortcut, func(_ *menu.CallbackData) {
		wRuntime.EventsEmit(startContext, "preferences")
	})
	fileMenu.AddSeparator()
	if runtime.GOOS == "darwin" {
		appMenu.Append(menu.EditMenu()) // on macos platform, we should append EditMenu to enable Cmd+C,Cmd+V,Cmd+Z... shortcut
	}
	fileMenu.AddText("Quit", keys.CmdOrCtrl("q"), func(_ *menu.CallbackData) {
		app.Quit()
	})
	app.SetApplicationMenu(appMenu)

	if err := app.Run(); err != nil {
		println("Error:", err.Error())
		return
	}
}
