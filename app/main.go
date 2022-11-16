package main

import (
	"context"
	"embed"
	"os"

	"github.com/datafund/fdfs/pkg/handler"
	"github.com/fairdatasociety/fairOS-dfs/pkg/logging"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
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
	// Create application with options
	err = wails.Run(&options.App{
		Title:  "app",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		Bind: []interface{}{
			dfsHandler,
			cnf,
		},
		OnStartup: func(_ context.Context) {
			err := cnf.ReadConfig()
			if err != nil {
				println("read config failed ", err.Error())
			}
			c := cnf.GetConfig()
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

	if err != nil {
		println("Error:", err.Error())
	}
}
