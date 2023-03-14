package handler

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"github.com/fairdatasociety/fairOS-dfs/pkg/utils"

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

type CacheCleaner interface {
	CacheClean()
}

type subscribedPod struct {
	podName string
	subHash string
}

type Handler struct {
	lock                     sync.Mutex
	api                      *api.DfsAPI
	activeMounts             map[string]*hostMount
	logger                   logging.Logger
	sessionID                string
	lastLoadedPods           []string
	lastLoadedSharedPods     []string
	lastLoadedSubscribedPods []subscribedPod
}

type hostMount struct {
	h    *fuse.FileSystemHost
	c    CacheCleaner
	path string
}

type PodMountedInfo struct {
	PodName    string `json:"podName"`
	IsMounted  bool   `json:"isMounted"`
	MountPoint string `json:"mountPoint"`
	IsShared   bool   `json:"isShared"`
}

type SubscriptionInfo struct {
	SubHash    string `json:"subHash"`
	IsMounted  bool   `json:"isMounted"`
	PodName    string `json:"podName"`
	PodAddress string `json:"address"`
	MountPoint string `json:"mountPoint"`
	ValidTill  int64  `json:"validTill"`
}

type LiteUser struct {
	Mnemonic   string `json:"mnemonic"`
	PrivateKey string `json:"privateKey"`
}

type CachedPod struct {
	PodsMounted []*PodMountedInfo   `json:"podsMounted"`
	SubsMounted []*SubscriptionInfo `json:"subsMounted"`
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

func (h *Handler) Fork(podName, forkName string) error {
	if h.api == nil {
		h.logger.Errorf("mount: fairos not initialised")
		return ErrFairOsNotInitialised
	}
	return h.api.ForkPod(podName, forkName, h.sessionID)
}

func (h *Handler) ForkFromReference(forkName, reference string) error {
	if h.api == nil {
		h.logger.Errorf("mount: fairos not initialised")
		return ErrFairOsNotInitialised
	}
	return h.api.ForkPodFromRef(forkName, reference, h.sessionID)
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
	pi, err := h.api.GetPodInfo(pod, h.sessionID, createPod)
	if err != nil {
		return err
	}
	dfsFuse, err := dfuse.New(h.sessionID, pi, h.api, h.logger)
	if err != nil {
		return err
	}

	sig := make(chan string)
	host := fuse.NewFileSystemHost(dfsFuse)

	opts := mountOptions(pod)
	if readOnly {
		opts = append(opts, "-o", "ro")
	}
	go func() {
		defer func() {
			if r := recover(); r != nil {
				sig <- fmt.Sprintf("%v", r)
			}
			defer close(sig)
		}()
		host.SetCapReaddirPlus(true)
		host.Mount(mountPoint, opts)
		sig <- ""
	}()
	select {
	case <-time.After(time.Second * 2):
	case e := <-sig:
		if e == "" {
			return fmt.Errorf("failed to mount")
		}
		return fmt.Errorf(e)
	}
	h.activeMounts[pod] = &hostMount{
		h:    host,
		c:    dfsFuse,
		path: mountPoint,
	}
	h.logger.Infof("%s is mounted at %s", pod, mountPoint)
	return nil
}

func (h *Handler) MountSubscribedPod(subHash, location string) error {

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

	h.lock.Lock()
	defer h.lock.Unlock()
	_, ok := h.activeMounts[subHash]
	if ok {
		return fmt.Errorf("subscribed pod is already mounted")
	}

	s, err := utils.Decode(subHash)
	if err != nil {
		return err
	}

	var subHashBytes [32]byte
	copy(subHashBytes[:], s)

	pi, err := h.api.OpenSubscribedPod(h.sessionID, subHashBytes)
	if err != nil {
		return err
	}

	mountName := fmt.Sprintf("%s-%s", pi.GetPodName(), subHash)
	parent := filepath.Join(location, root)
	mountPoint := filepath.Join(parent, mountName)
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

	dfsFuse, err := dfuse.New(h.sessionID, pi, h.api, h.logger)
	if err != nil {
		return err
	}

	sig := make(chan string)
	host := fuse.NewFileSystemHost(dfsFuse)

	opts := mountOptions(mountName)
	opts = append(opts, "-o", "ro")

	go func() {
		defer func() {
			if r := recover(); r != nil {
				sig <- fmt.Sprintf("%v", r)
			}
			defer close(sig)
		}()
		host.SetCapReaddirPlus(true)
		host.Mount(mountPoint, opts)
		sig <- ""
	}()
	select {
	case <-time.After(time.Second * 2):
	case e := <-sig:
		if e == "" {
			return fmt.Errorf("failed to mount")
		}
		return fmt.Errorf(e)
	}
	h.activeMounts[subHash] = &hostMount{
		h:    host,
		c:    dfsFuse,
		path: mountPoint,
	}
	h.logger.Infof("%s is mounted at %s", mountName, mountPoint)
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
	pods, shared, err := h.api.ListPods(h.sessionID)
	if err != nil {
		return nil, err
	}
	h.lastLoadedPods = pods
	h.lastLoadedSharedPods = shared
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
	for _, podName := range shared {
		host, ok := h.activeMounts[podName]
		podMounted := &PodMountedInfo{
			PodName:   podName,
			IsMounted: ok,
			IsShared:  true,
		}
		if ok {
			podMounted.MountPoint = host.path
		}
		podsMounted = append(podsMounted, podMounted)
	}
	return podsMounted, err
}

func (h *Handler) GetCashedPods() *CachedPod {
	if h.api == nil {
		return nil
	}
	h.lock.Lock()
	defer h.lock.Unlock()
	podsMounted := []*PodMountedInfo{}
	subsMounted := []*SubscriptionInfo{}
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
	for _, podName := range h.lastLoadedSharedPods {
		host, ok := h.activeMounts[podName]
		podMounted := &PodMountedInfo{
			PodName:   podName,
			IsMounted: ok,
			IsShared:  true,
		}
		if ok {
			podMounted.MountPoint = host.path
		}
		podsMounted = append(podsMounted, podMounted)
	}
	for _, sp := range h.lastLoadedSubscribedPods {
		host, ok := h.activeMounts[sp.subHash]
		//subHash := filepath.Base(host.path)
		podMounted := &SubscriptionInfo{
			PodName:   sp.podName,
			IsMounted: ok,
			SubHash:   sp.subHash,
		}
		if ok {
			podMounted.MountPoint = host.path
		}
		subsMounted = append(subsMounted, podMounted)
	}
	return &CachedPod{podsMounted, subsMounted}
}

func (h *Handler) CreatePod(podname string) (*pod.Info, error) {
	if h.api == nil {
		h.logger.Errorf("create pod: fairos not initialised")
		return nil, ErrFairOsNotInitialised
	}
	return h.api.CreatePod(podname, h.sessionID)
}

func (h *Handler) DeletePod(podname string) error {
	if h.api == nil {
		h.logger.Errorf("delete pod: fairos not initialised")
		return ErrFairOsNotInitialised
	}
	return h.api.DeletePod(podname, h.sessionID)
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

func (h *Handler) Sync(podName string) {
	if h.api == nil {
		return
	}
	h.lock.Lock()
	defer h.lock.Unlock()
	host, ok := h.activeMounts[podName]
	if ok {
		err := h.api.SyncPodAsync(context.TODO(), podName, h.sessionID)
		if err != nil {
			h.logger.Errorf("%s pod sync failed: %s", podName, err.Error())
		}
		host.c.CacheClean()
		h.logger.Infof("%s mount cache cleaned", podName)
	}
}

func (h *Handler) SharePod(podName string) (string, error) {
	if h.api == nil {
		return "", ErrFairOsNotInitialised
	}
	return h.api.PodShare(podName, "", h.sessionID)
}

func (h *Handler) SubscribedPods() ([]*SubscriptionInfo, error) {
	if h.api == nil {
		return nil, ErrFairOsNotInitialised
	}
	subs, err := h.api.GetSubscriptions(h.sessionID)
	if err != nil {
		return nil, err
	}
	res := []*SubscriptionInfo{}
	subscribedPods := []subscribedPod{}
	for _, sub := range subs {
		s := subscribedPod{
			podName: sub.PodName,
			subHash: "0x" + utils.Encode(sub.SubHash[:]),
		}
		subscribedPods = append(subscribedPods, s)
		res = append(res, &SubscriptionInfo{
			SubHash:    "0x" + utils.Encode(sub.SubHash[:]),
			PodName:    sub.PodName,
			PodAddress: sub.PodAddress,
			ValidTill:  sub.ValidTill,
		})
	}
	h.lock.Lock()
	defer h.lock.Unlock()
	h.lastLoadedSubscribedPods = subscribedPods
	return res, nil
}

func (h *Handler) ReceivePod(podSharingReference, podName string) error {
	if h.api == nil {
		return ErrFairOsNotInitialised
	}
	ref, err := utils.ParseHexReference(podSharingReference)
	if err != nil {
		return err
	}

	_, err = h.api.PodReceive(h.sessionID, podName, ref)
	return err
}

func (h *Handler) StartCacheCleaner(ctx context.Context) {
	ticker := time.NewTicker(time.Minute * 30)
	for {
		select {
		case <-ctx.Done():
			ticker.Stop()
			return
		case <-ticker.C:
			h.lock.Lock()
			for podName, host := range h.activeMounts {
				err := h.api.SyncPodAsync(ctx, podName, h.sessionID)
				if err != nil {
					h.logger.Errorf("%s pod sync failed: %s", podName, err.Error())
				}
				host.c.CacheClean()
				h.logger.Infof("%s mount cache cleaned", podName)
			}
			h.lock.Unlock()
		}
	}
}

func mountOptions(pod string) (options []string) {
	options = []string{}
	//options = append(options, "-o", "debug")
	options = append(options, "-o", "exec")

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
