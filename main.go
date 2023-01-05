package main

import (
	"context"
	"embed"
	"fmt"
	"os"
	"runtime"

	"github.com/fairdatasociety/fairOS-dfs/pkg/logging"
	"github.com/fairdatasociety/fairdrive-desktop-app/pkg/handler"
	"github.com/sirupsen/logrus"
	"github.com/wailsapp/wails/v2/pkg/application"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	wRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	log = ".fda.log"
)

var (
	//go:embed all:frontend/dist
	assets embed.FS
)

func main() {
	logger := logging.New(os.Stdout, logrus.DebugLevel)

	//home, err := homedir.Dir()
	//if err == nil {
	//	file, err := os.Create(filepath.Join(home, log))
	//	if err == nil {
	//		logger = logging.New(file, logrus.ErrorLevel)
	//		defer file.Close()
	//	}
	//}
	dfsHandler, err := handler.New(logger)
	if err != nil {
		println("Error:", err.Error())
		return
	}
	cnf := &conf{}
	acc := newAccount()
	abt := &about{}
	var startContext context.Context

	appMenu := menu.NewMenu()
	fileMenu := appMenu.AddSubmenu("File")

	prefShortcut := keys.CmdOrCtrl(",")
	if runtime.GOOS == "windows" {
		prefShortcut = keys.Combo("P", keys.CmdOrCtrlKey, keys.ShiftKey)
	}
	fileMenu.AddText("About", nil, func(_ *menu.CallbackData) {
		wRuntime.EventsEmit(startContext, "about")
	})
	//fileMenu.AddText("Check for updates...", nil, func(_ *menu.CallbackData) {
	//	// TODO check for update
	//})
	fileMenu.AddSeparator()

	fileMenu.AddText("Accounts", keys.CmdOrCtrl("s"), func(_ *menu.CallbackData) {
		wRuntime.EventsEmit(startContext, "showAccounts")
	})

	fileMenu.AddText("Preferences", prefShortcut, func(_ *menu.CallbackData) {
		wRuntime.EventsEmit(startContext, "preferences")
	})

	fileMenu.AddSeparator()
	if runtime.GOOS == "darwin" {
		appMenu.Append(menu.EditMenu()) // on macos platform, we should append EditMenu to enable Cmd+C,Cmd+V,Cmd+Z... shortcut
	}
	fileMenu.AddText("Import Account", keys.CmdOrCtrl("g"), func(_ *menu.CallbackData) {
		wRuntime.EventsEmit(startContext, "accountImport")
	})
	fileMenu.AddText("Account Details", keys.CmdOrCtrl("i"), func(_ *menu.CallbackData) {
		wRuntime.EventsEmit(startContext, "accountDetails")
	})
	fileMenu.AddText("Logout", keys.Combo("W", keys.ShiftKey, keys.CmdOrCtrlKey), func(_ *menu.CallbackData) {
		wRuntime.EventsEmit(startContext, "logout")
	})
	fileMenu.AddSeparator()

	podMenu := appMenu.AddSubmenu("Pod")
	podMenu.AddText("New", keys.CmdOrCtrl("n"), func(_ *menu.CallbackData) {
		wRuntime.EventsEmit(startContext, "podNew")
	})
	//podMenu.AddSeparator()
	//auto := podMenu.AddText("Auto mount", nil, func(it *menu.CallbackData) {
	//	err = cnf.setAutomount(it.MenuItem.Checked)
	//	if err != nil {
	//		println("saving auto mount config failed ", err.Error())
	//		return
	//	}
	//})
	//auto.Type = menu.CheckboxType
	helpMenu := appMenu.AddSubmenu("Help")
	helpMenu.AddText("Report a problem", nil, func(_ *menu.CallbackData) {
		wRuntime.BrowserOpenURL(startContext, "https://github.com/fairDataSociety/fairdrive-desktop-app/issues")
	})
	helpMenu.AddText("FDA Help", nil, func(_ *menu.CallbackData) {
		wRuntime.BrowserOpenURL(startContext, "https://fairdatasociety.github.io/fairdrive-desktop-app/")
	})

	// This is a quick fix for https://github.com/fairDataSociety/fairdrive-desktop-app/issues/91
	// This is happening on FDA only, tried with wails new app on linux, ran without an issue
	// TODO find the reason for this
	disableResize := true
	if runtime.GOOS == "linux" {
		disableResize = false
	}
	// Create application with options
	app := application.NewWithOptions(&options.App{
		Title:         "Fairdrive",
		Width:         375,
		Height:        667,
		DisableResize: disableResize,
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
			wRuntime.EventsOn(startContext, "open", func(l ...interface{}) {
				location := ""
				if len(l) == 1 {
					location = fmt.Sprintf("%s", l[0])
				}
				if location != "" {
					err := Run(location)
					if err != nil {
						println("directory open failed ", err.Error())
						return
					}
				}
			})
			wRuntime.EventsOn(startContext, "disableMenus", func(_ ...interface{}) {
				for _, item := range podMenu.Items {
					if item.Label == "New" {
						item.Disabled = false
						break
					}
				}
				for _, item := range fileMenu.Items {
					if item.Label == "Logout" {
						item.Disabled = true
						//break
					}

					if item.Label == "Account Details" {
						item.Disabled = true
						//break
					}
				}
				wRuntime.MenuUpdateApplicationMenu(startContext)
			})
			wRuntime.EventsOn(startContext, "enableMenus", func(_ ...interface{}) {
				for _, item := range podMenu.Items {
					if item.Label == "New" {
						item.Disabled = false
						break
					}
				}
				for _, item := range fileMenu.Items {
					if item.Label == "Logout" {
						item.Disabled = false
						//break
					}
					if item.Label == "Account Details" {
						item.Disabled = false
						//break
					}
				}
				wRuntime.MenuUpdateApplicationMenu(startContext)
			})

			wRuntime.EventsOn(startContext, "showDirectoryDialog", func(l ...interface{}) {
				location := ""
				if len(l) == 1 {
					location = fmt.Sprintf("%s", l[0])
				}
				location, err = wRuntime.OpenDirectoryDialog(startContext, wRuntime.OpenDialogOptions{DefaultDirectory: location})
				if err != nil {
					println("select directory failed ", err.Error())
					return
				}
				wRuntime.EventsEmit(startContext, "mountPointSelected", location)
			})
			wRuntime.EventsOn(startContext, "Mount", func(...interface{}) {
				allPods := dfsHandler.GetCashedPods()
				podsToSave := []string{}
				for _, podItem := range allPods {
					if podItem.IsMounted {
						podsToSave = append(podsToSave, podItem.PodName)
					}
				}
				err := cnf.setMountedPods(podsToSave)
				if err != nil {
					println("failed to same mounted pods for automount ", err.Error())
					return
				}
			})

			err := cnf.ReadConfig()
			if err != nil {
				println("read config failed ", err.Error())
				return
			}

			if cnf.IsSet() {
				//auto.Checked = cnf.autoMount
				wRuntime.MenuUpdateApplicationMenu(startContext)
				wRuntime.EventsEmit(startContext, "mountThesePods")
			}

			go dfsHandler.StartCacheCleaner(startContext)
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
