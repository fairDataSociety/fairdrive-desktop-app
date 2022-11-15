package handler

import (
	"context"
	"fmt"
	"io"
	"runtime"
	"sync"

	"github.com/fairdatasociety/fairOS-dfs/pkg/logging"

	"github.com/datafund/fdfs/pkg/api"
	dfuse "github.com/datafund/fdfs/pkg/fuse"
	"github.com/winfsp/cgofuse/fuse"
)

type Handler struct {
	lock         sync.Mutex
	api          *api.DfsAPI
	activeMounts map[string]*fuse.FileSystemHost
	logger       logging.Logger
	io.Closer
}

func New(logger logging.Logger, fc *api.FairOSConfig) (*Handler, error) {
	a, err := api.New(logger, fc)
	if err != nil {
		return nil, err
	}
	return &Handler{
		api:          a,
		activeMounts: map[string]*fuse.FileSystemHost{},
		logger:       logger,
	}, nil
}

func (h *Handler) Login(username, password string) (string, error) {
	return h.api.Login(username, password)
}

func (h *Handler) Mount(ctx context.Context, pod, password, sessionId, mountPoint string, createPod bool) error {
	h.lock.Lock()
	defer h.lock.Unlock()
	_, ok := h.activeMounts[pod]
	if ok {
		return fmt.Errorf("%s is already mounted", pod)
	}
	pi, err := h.api.GetPodInfo(ctx, pod, password, sessionId, createPod)
	if err != nil {
		return err
	}
	dfsFuse, err := dfuse.New(sessionId, pi, h.api, h.logger)
	if err != nil {
		return err
	}

	host := fuse.NewFileSystemHost(dfsFuse)
	go func() {
		var fuseArgs = []string{}
		if runtime.GOOS == "darwin" {
			fuseArgs = append(fuseArgs, "-onoappledouble")
		}
		host.Mount(mountPoint, fuseArgs)
	}()
	fmt.Printf("%s is accessable at %s\n", pod, mountPoint)
	h.activeMounts[pod] = host
	return nil
}

func (h *Handler) Unmount(pod, sessionId string) error {
	h.lock.Lock()
	defer h.lock.Unlock()
	host, ok := h.activeMounts[pod]
	if !ok || host == nil {
		return fmt.Errorf("%s is not mounted", pod)
	}
	host.Unmount()
	return h.api.ClosePod(pod, sessionId)
}
