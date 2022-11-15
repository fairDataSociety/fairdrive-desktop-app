package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/datafund/fdfs/pkg/api"
	"github.com/datafund/fdfs/pkg/handler"
	"github.com/fairdatasociety/fairOS-dfs/pkg/logging"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	fc := &api.FairOSConfig{
		IsProxy: false,
		Bee:     "http://localhost:1633",
		Batch:   "cf92f886d9f2f3696f349dd3475b643b30eccdb670fb1ab35350e100a9629996",
		RPC:     "http://localhost:9545",
		Network: "play",
	}
	logger := logging.New(os.Stdout, 5)
	h, err := handler.New(logger, fc)
	if err != nil {
		log.Fatal(err)
	}
	sessionId, err := h.Login("340e69bd9f655ba75358403f2259f75f", "24256166ff1b")
	if err != nil {
		log.Fatal(err)
	}
	err = h.Mount(context.Background(), "47822b6540", "24256166ff1b", sessionId, "/tmp/1", false)
	if err != nil {
		log.Fatal(err)
	}

	err = h.Mount(context.Background(), "a6b20669d7", "24256166ff1b", sessionId, "/tmp/2", false)
	if err != nil {
		log.Fatal(err)
	}
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
