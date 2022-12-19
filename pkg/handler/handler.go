package handler

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"github.com/fairdatasociety/fairOS-dfs/pkg/logging"
	"github.com/fairdatasociety/fairOS-dfs/pkg/pod"
	"github.com/fairdatasociety/fairdrive-desktop-app/pkg/api"
	dfuse "github.com/fairdatasociety/fairdrive-desktop-app/pkg/fuse"
	"github.com/mitchellh/go-homedir"
	"github.com/winfsp/cgofuse/fuse"
)

var (
	ErrFairOsNotInitialised = fmt.Errorf("fairos not initialised")

	root = "Fairdrive"
)

type Handler struct {
	lock           sync.Mutex
	api            *api.DfsAPI
	activeMounts   map[string]*hostMount
	logger         logging.Logger
	sessionID      string
	lastLoadedPods []string
}

type hostMount struct {
	h    *fuse.FileSystemHost
	path string
}

type PodMountedInfo struct {
	PodName    string `json:"podName"`
	IsMounted  bool   `json:"isMounted"`
	MountPoint string `json:"mountPoint"`
}

type LiteUser struct {
	Mnemonic   string `json:"mnemonic"`
	PrivateKey string `json:"privateKey"`
}

func New(logger logging.Logger) (*Handler, error) {
	return &Handler{
		activeMounts: map[string]*hostMount{},
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

func (h *Handler) Load(username, password, mnemonic string) (*LiteUser, error) {
	if h.api == nil {
		h.logger.Errorf("login: fairos not initialised")
		return nil, ErrFairOsNotInitialised
	}
	mnemonic, privateKey, sessionID, err := h.api.Load(username, password, mnemonic)
	if err != nil {
		return nil, err
	}
	h.sessionID = sessionID
	u := &LiteUser{
		Mnemonic:   mnemonic,
		PrivateKey: privateKey,
	}
	return u, nil
}

func (h *Handler) Logout() error {
	if h.api == nil {
		h.logger.Errorf("logout: fairos not initialised")
		return ErrFairOsNotInitialised
	}
	h.lock.Lock()
	defer h.lock.Unlock()
	for podName, host := range h.activeMounts {
		host.h.Unmount()
		delete(h.activeMounts, podName)
	}
	return h.api.LogoutUser(h.sessionID)
}

func (h *Handler) Mount(pod, location string, readOnly bool) error {
	createPod := false
	if h.api == nil {
		h.logger.Errorf("mount: fairos not initialised")
		return ErrFairOsNotInitialised
	}
	if location == "" {
		home, err := homedir.Dir()
		if err != nil {
			home = ""
		}
		location = home
	}
	parent := filepath.Join(location, root)
	mountPoint := filepath.Join(parent, pod)
	if runtime.GOOS == "linux" {
		if _, err := os.Stat(mountPoint); err != nil {
			err = os.MkdirAll(mountPoint, 0766)
			if err != nil {
				return err
			}
		}
	} else {
		if _, err := os.Stat(parent); err != nil {
			err = os.MkdirAll(parent, 0700)
			if err != nil {
				return err
			}
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
	opts := mountOptions(pod)
	if readOnly {
		opts = append(opts, "-o", "ro")
	}
	go func() {
		host.SetCapReaddirPlus(true)
		host.Mount(mountPoint, opts)
		close(sig)
	}()
	select {
	case <-time.After(time.Second * 1):
		h.activeMounts[pod] = &hostMount{
			h:    host,
			path: mountPoint,
		}
	case <-sig:
		return fmt.Errorf("failed to mount")
	}
	h.logger.Infof("%s is mounted at %s", pod, mountPoint)
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
	u := host.h.Unmount()
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
		host, ok := h.activeMounts[podName]
		podMounted := &PodMountedInfo{
			PodName:   podName,
			IsMounted: ok,
		}
		if ok {
			podMounted.MountPoint = host.path
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
		host, ok := h.activeMounts[podName]
		podMounted := &PodMountedInfo{
			PodName:   podName,
			IsMounted: ok,
		}
		if ok {
			podMounted.MountPoint = host.path
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
	for podName, host := range h.activeMounts {
		host.h.Unmount()
		delete(h.activeMounts, podName)
	}
	return h.api.Close()
}

func mountOptions(pod string) (options []string) {
	options = []string{}
	options = append(options, "-o", "debug")

	if runtime.GOOS == "windows" {
		options = append(options, "--FileSystemName="+pod)
		// options = append(options, "kernel_cache")
		// options = append(options, "noauto_cache")
		// options = append(options, "norellinks")
	} else {
		options = append(options, "-o", "fsname="+pod)
		//options = append(options, "-o", "atomic_o_trunc")
		if runtime.GOOS == "darwin" {
			options = append(options, "-o", "volname="+pod)

			options = append(options, "-o", "noappledouble")
			//options = append(options, "-o", "noapplexattr")
		}
	}
	return options
}
