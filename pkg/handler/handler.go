package handler

import (
	"context"
	"fmt"
	"runtime"
	"sync"
	"time"

	"github.com/fairdatasociety/fairOS-dfs/pkg/logging"

	"github.com/datafund/fdfs/pkg/api"
	dfuse "github.com/datafund/fdfs/pkg/fuse"
	"github.com/winfsp/cgofuse/fuse"
)

var (
	ErrFairOsNotInitialised = fmt.Errorf("fairOs not initialised")
)

type Handler struct {
	lock         sync.Mutex
	api          *api.DfsAPI
	activeMounts map[string]*fuse.FileSystemHost
	logger       logging.Logger
	sessionID    string
}

func New(logger logging.Logger) (*Handler, error) {
	return &Handler{
		activeMounts: map[string]*fuse.FileSystemHost{},
		logger:       logger,
	}, nil
}

func (h *Handler) Start(fc *api.FairOSConfig) (err error) {
	h.lock.Lock()
	defer h.lock.Unlock()
	h.api, err = api.New(h.logger, fc)
	if err != nil {
		return err
	}
	return nil
}

func (h *Handler) Login(username, password string) error {
	if h.api == nil {
		return ErrFairOsNotInitialised
	}
	sessionID, err := h.api.Login(username, password)
	if err != nil {
		return err
	}
	h.sessionID = sessionID
	return err
}

func (h *Handler) Logout() error {
	if h.api == nil {
		return ErrFairOsNotInitialised
	}
	return h.api.LogoutUser(h.sessionID)
}

func (h *Handler) Mount(pod, mountPoint string, createPod bool) error {
	if h.api == nil {
		return ErrFairOsNotInitialised
	}
	h.lock.Lock()
	defer h.lock.Unlock()
	_, ok := h.activeMounts[pod]
	if ok {
		return fmt.Errorf("%s is already mounted", pod)
	}
	ctx := context.Background()
	pi, err := h.api.GetPodInfo(ctx, pod, h.sessionID, createPod)
	if err != nil {
		return err
	}
	dfsFuse, err := dfuse.New(h.sessionID, pi, h.api, h.logger)
	if err != nil {
		return err
	}

	sig := make(chan int)
	host := fuse.NewFileSystemHost(dfsFuse)
	go func() {
		var fuseArgs = []string{}
		if runtime.GOOS == "darwin" {
			fuseArgs = append(fuseArgs, "-onoappledouble")
		}
		host.Mount(mountPoint, fuseArgs)
		close(sig)
	}()
	select {
	case <-time.After(time.Second * 1):
		h.activeMounts[pod] = host
	case <-sig:
		return fmt.Errorf("failed to mount")
	}
	return nil
}

func (h *Handler) Unmount(pod string) error {
	if h.api == nil {
		return ErrFairOsNotInitialised
	}
	h.lock.Lock()
	defer h.lock.Unlock()
	host, ok := h.activeMounts[pod]
	if !ok || host == nil {
		return fmt.Errorf("%s is not mounted", pod)
	}
	u := host.Unmount()
	if !u {
		return fmt.Errorf("unmount failed")
	}
	delete(h.activeMounts, pod)
	return h.api.ClosePod(pod, h.sessionID)
}

func (h *Handler) GetPodsList() ([]string, error) {
	if h.api == nil {
		return []string{}, ErrFairOsNotInitialised
	}
	pods, _, err := h.api.ListPods(h.sessionID)
	if err != nil {
		return nil, err
	}
	return pods, err
}

func (h *Handler) Close() error {
	if h.api == nil {
		return nil
	}

	h.lock.Lock()
	defer h.lock.Unlock()
	for pod, host := range h.activeMounts {
		host.Unmount()
		delete(h.activeMounts, pod)
	}
	return h.api.Close()
}
