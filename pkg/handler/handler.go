package handler

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"github.com/datafund/fdfs/pkg/api"
	dfuse "github.com/datafund/fdfs/pkg/fuse"
	"github.com/fairdatasociety/fairOS-dfs/pkg/logging"
	"github.com/fairdatasociety/fairOS-dfs/pkg/pod"
	"github.com/winfsp/cgofuse/fuse"
)

var (
	ErrFairOsNotInitialised = fmt.Errorf("fairos not initialised")

	root = "Fairdrive"
)

type Handler struct {
	lock           sync.Mutex
	api            *api.DfsAPI
	activeMounts   map[string]*fuse.FileSystemHost
	logger         logging.Logger
	sessionID      string
	lastLoadedPods []string
}

type PodMountedInfo struct {
	PodName   string `json:"podName"`
	IsMounted bool   `json:"isMounted"`
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
		h.logger.Errorf("start: fairos initialisation failed: %s", err.Error())
		return err
	}
	return nil
}

func (h *Handler) Login(username, password string) error {
	if h.api == nil {
		h.logger.Errorf("login: fairos not initialised")
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
		h.logger.Errorf("logout: fairos not initialised")
		return ErrFairOsNotInitialised
	}
	return h.api.LogoutUser(h.sessionID)
}

func (h *Handler) Mount(pod, location string, createPod bool) error {
	if h.api == nil {
		h.logger.Errorf("mount: fairos not initialised")
		return ErrFairOsNotInitialised
	}
	mountPoint := filepath.Join(location, root, pod)
	if _, err := os.Stat(mountPoint); err != nil {
		err = os.MkdirAll(mountPoint, 0700)
		if err != nil {
			return err
		}
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
		h.logger.Errorf("unmount: fairos not initialised")
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

func (h *Handler) GetPodsList() ([]*PodMountedInfo, error) {
	if h.api == nil {
		h.logger.Errorf("get pod list: fairos not initialised")
		return nil, ErrFairOsNotInitialised
	}
	h.lock.Lock()
	defer h.lock.Unlock()
	pods, _, err := h.api.ListPods(h.sessionID)
	if err != nil {
		return nil, err
	}
	h.lastLoadedPods = pods
	podsMounted := []*PodMountedInfo{}
	for _, podName := range pods {
		_, ok := h.activeMounts[podName]
		podMounted := &PodMountedInfo{
			PodName:   podName,
			IsMounted: ok,
		}
		podsMounted = append(podsMounted, podMounted)
	}
	return podsMounted, err
}

func (h *Handler) GetCashedPods() []*PodMountedInfo {
	if h.api == nil {
		return nil
	}
	h.lock.Lock()
	defer h.lock.Unlock()
	podsMounted := []*PodMountedInfo{}
	for _, podName := range h.lastLoadedPods {
		_, ok := h.activeMounts[podName]
		podMounted := &PodMountedInfo{
			PodName:   podName,
			IsMounted: ok,
		}
		podsMounted = append(podsMounted, podMounted)
	}
	return podsMounted
}

func (h *Handler) CreatePod(podname string) (*pod.Info, error) {
	if h.api == nil {
		h.logger.Errorf("create pod: fairos not initialised")
		return nil, ErrFairOsNotInitialised
	}
	return h.api.CreatePod(podname, h.sessionID)
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
