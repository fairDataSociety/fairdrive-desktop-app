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
	abt := &about{}
	var startContext context.Context

	appMenu := menu.NewMenu()
	fileMenu := appMenu.AddSubmenu("File")

	prefShortcut := keys.CmdOrCtrl(",")
	if runtime.GOOS == "windows" {
		prefShortcut = keys.Combo(",", keys.CmdOrCtrlKey, keys.ShiftKey)
	}
	fileMenu.AddText("About", nil, func(_ *menu.CallbackData) {
		wRuntime.EventsEmit(startContext, "about")
	})
	fileMenu.AddText("Check for updates...", nil, func(_ *menu.CallbackData) {
		// TODO check for update
	})
	fileMenu.AddSeparator()

	fileMenu.AddText("Preferences", prefShortcut, func(_ *menu.CallbackData) {
		wRuntime.EventsEmit(startContext, "preferences")
	})
	fileMenu.AddSeparator()
	if runtime.GOOS == "darwin" {
		appMenu.Append(menu.EditMenu()) // on macos platform, we should append EditMenu to enable Cmd+C,Cmd+V,Cmd+Z... shortcut
	}
	fileMenu.AddText("Logout", keys.Combo("W", keys.ShiftKey, keys.CmdOrCtrlKey), func(item *menu.CallbackData) {
		wRuntime.EventsEmit(startContext, "logout")
	})

	podMenu := appMenu.AddSubmenu("Pod")
	podMenu.AddText("New", keys.CmdOrCtrl("n"), func(_ *menu.CallbackData) {
		wRuntime.EventsEmit(startContext, "podNew")
	})
	helpMenu := appMenu.AddSubmenu("Help")
	helpMenu.AddText("Report a problem", nil, func(_ *menu.CallbackData) {
		// TODO Report a problem
	})
	helpMenu.AddText("Fairdrive Help", nil, func(_ *menu.CallbackData) {
		// TODO redirect to FAQ
	})

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
			abt,
		},
		OnStartup: func(ctx context.Context) {
			startContext = ctx
			err := cnf.ReadConfig()
			if err != nil {
				println("read config failed ", err.Error())
				return
			}
			wRuntime.EventsOn(startContext, "disableMenus", func(_ ...interface{}) {
				for _, item := range podMenu.Items {
					item.Disabled = true
				}
				for _, item := range fileMenu.Items {
					if item.Label == "Logout" {
						item.Disabled = true
						break
					}
				}
				wRuntime.MenuUpdateApplicationMenu(startContext)
			})
			wRuntime.EventsOn(startContext, "enableMenus", func(_ ...interface{}) {
				for _, item := range podMenu.Items {
					item.Disabled = false
				}
				for _, item := range fileMenu.Items {
					if item.Label == "Logout" {
						item.Disabled = false
						break
					}
				}
				wRuntime.MenuUpdateApplicationMenu(startContext)
			})
			wRuntime.EventsOn(startContext, "showDirectoryDialog", func(_ ...interface{}) {
				location, err := wRuntime.OpenDirectoryDialog(startContext, wRuntime.OpenDialogOptions{})
				if err != nil {
					println("select directory failed ", err.Error())
					return
				}
				wRuntime.EventsEmit(startContext, "mountPointSelected", location)
			})
		},
		OnShutdown: func(_ context.Context) {
			dfsHandler.Close()
		},
	})
	fileMenu.AddText("Quit", keys.CmdOrCtrl("q"), func(_ *menu.CallbackData) {
		app.Quit()
	})
	app.SetApplicationMenu(appMenu)

	if err := app.Run(); err != nil {
		println("Error:", err.Error())
		return
	}
}
