import {
  Box, Card, CardActions, CardContent,
  Checkbox,
  Container,
  IconButton,
  Tab,
  Tooltip,
  Typography
} from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import { copyUrlToClipboard } from "../utils/copyToClipboard";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { EventsEmit } from "../../wailsjs/runtime";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AltRouteIcon from "@mui/icons-material/AltRoute";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import { handler } from "../../wailsjs/go/models";
import React, { SyntheticEvent, useState } from "react";
import { SharePod, Sync } from "../../wailsjs/go/handler/Handler";
import SharedReferenceComponent from "./sharedReference";
import ForkPodComponent from "./forkPod";
import DeleteConfirmComponent from "./deleteConfirm";
import PodMountedInfo = handler.PodMountedInfo;
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { categoriesMap } from "../utils/categories";

interface PodProps {
  pods: PodMountedInfo[]
  subscribedPods: handler.SubscriptionInfo[]
  username: string
  mnemonic: string
  onError: (arg0: string) => void
  setShowAccounts: (arg: boolean) => void
  showLoader: (arg: boolean) => void
  isLoading: boolean
  onSuccess: () => void
  mount: (e: any) => void
  mountSubscribedPods: (e: any) => void
  initialTab: string
}

function PodsComponent(
  {
    mount,
    mountSubscribedPods,
    onSuccess,
    isLoading,
    onError,
    pods,
    subscribedPods,
    username,
    mnemonic,
    setShowAccounts,
    showLoader,
    initialTab,
  }: PodProps) {
  const [showSharedReference, setShowSharedReference] = useState<boolean>(false)
  const [sharedReference, setSharedReference] = useState('')
  const [sharedPodName, setSharedPodName] = useState('')
  const handleSharedReferenceClose = () => {
    setSharedReference('')
    setSharedPodName('')
    setShowSharedReference(false)
  }
  const share = async (podName: string) => {
    showLoader(true)
    try {
      let ref = await SharePod(podName)
      setSharedReference(ref)
      setSharedPodName(podName)
      setShowSharedReference(true)
    } catch (e) {
      onError(String(e))
    }
    showLoader(false)
  }

  const sync = async (podName: string) => {
    try {
      showLoader(true)
      await Sync(podName)
    } catch (e) {
      onError(String(e))
    }
    showLoader(false)
  }

  const [showPodFork, setShowPodFork] = useState<boolean>(false)
  const [podToFork, setPodToFork] = useState('')
  const handlePodForkClose = () => {
    setPodToFork('')
    setShowPodFork(false)
  }
  const fork = async (podName: string) => {
    setPodToFork(podName)
    setShowPodFork(true)
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)
  const [podToDelete, setPodToDelete] = useState('')
  const handleDeleteClose = () => {
    setPodToDelete('')
    setShowDeleteConfirm(false)
  }
  const deleteConfirm = async (podName: string) => {
    setPodToDelete(podName)
    setShowDeleteConfirm(true)
  }

  const [value, setValue] = useState(initialTab);

  const handleChange = (event: SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };

  return (
    <>
      <Container component="main" maxWidth="xs">
        <Tooltip
          title="Existing pods are listed here. You can mount and unmount them, and they will auto-magically appear in your filesystem at mount point."
          placement="top"
        >
          <h2 style={{ marginBottom: '0px' }}>Pods</h2>
        </Tooltip>
        <Tooltip
          title={
            "Currently logged in with account '" +
            username +
            "'. Click to display accounts."
          }
        >
          <Typography
            style={{ color: 'gray', cursor: 'pointer' }}
            onClick={() => setShowAccounts(true)}
          >
            {username}
          </Typography>
        </Tooltip>
        <Tooltip
          title={
            'This is ' +
            (mnemonic === '' || mnemonic === undefined ? 'portable' : 'lite') +
            ' account'
          }
          placement="bottom"
        >
          <Typography style={{ color: 'gray', fontSize: '8px' }}>
            {mnemonic === '' || mnemonic === undefined ? 'portable' : 'lite'}
          </Typography>
        </Tooltip>
        <Box
          sx={{
            width: '100%',
            maxWidth: 360,
          }}
        >
          <TabContext value={value}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <TabList onChange={handleChange} aria-label="lab API tabs example">
                {
                  pods.length > 0 && (
                    <Tab
                      label={
                        <Tooltip title="List of your pods" placement="top">
                          <span>Private</span>
                        </Tooltip>
                      }
                      value="1"
                    />
                  )
                }
                {
                  pods.length > 0 && (
                    <Tab
                      label={
                        <Tooltip title="Imported pods" placement="right">
                          <span>Shared</span>
                        </Tooltip>
                      }
                      value="2"
                    />
                  )
                }
                {
                  subscribedPods.length > 0 && (
                    <Tab
                      label={
                        <Tooltip title="Subscribed pods" placement="right">
                          <span>Subscribed</span>
                        </Tooltip>
                      }
                      value="3"
                    />
                  )
                }
              </TabList>
            </Box>
            {
              pods.length > 0 && (
                <TabPanel value="1" sx={{ padding: 0 }}>
                  {pods.map((pod) =>
                    !pod.isShared ? (
                      <Card sx={{ maxWidth: 345, margin: '5px' }}>
                        <CardContent sx={{ padding: '0px' }}>
                          <Typography sx={{ textAlign: 'left' }}>
                            <Tooltip
                              title={
                                pod.isMounted ? 'Unmount this pod' : 'Mount this pod'
                              }
                            >
                              <Checkbox
                                onChange={mount}
                                value={pod.podName}
                                color="primary"
                                disabled={isLoading}
                                checked={pod.isMounted}
                              />
                            </Tooltip>

                            {pod.podName.length > 20
                              ? pod.podName.slice(0, 12) +
                                '....' +
                                pod.podName.slice(-12)
                              : pod.podName}
                          </Typography>
                        </CardContent>
                        {pod.isMounted ? (
                          <CardActions sx={{ justifyContent: 'end' }}>
                            <Tooltip title="Open">
                              <IconButton
                                onClick={() => EventsEmit('open', pod.mountPoint)}
                                sx={{ width: '20px', height: '20px', marginLeft: '5px' }}
                              >
                                <OpenInNewIcon sx={{ fontSize: '20px' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={pod.mountPoint}>
                              <IconButton
                                onClick={() => copyUrlToClipboard(pod.mountPoint)}
                                sx={{ width: '20px', height: '20px', marginLeft: '5px' }}
                              >
                                <ContentCopyIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Sync contents">
                              <IconButton
                                onClick={() => sync(pod.podName)}
                                disabled={isLoading}
                                sx={{ width: '20px', height: '20px', marginLeft: '5px' }}
                              >
                                <CloudSyncIcon sx={{ fontSize: '20px' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Share pod">
                              <IconButton
                                onClick={() => share(pod.podName)}
                                disabled={isLoading}
                                sx={{ width: '20px', height: '20px', marginLeft: '5px' }}
                              >
                                <ShareIcon sx={{ fontSize: '20px' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Duplicate">
                              <IconButton
                                onClick={() => fork(pod.podName)}
                                sx={{ width: '20px', height: '20px', marginLeft: '5px' }}
                              >
                                <AltRouteIcon sx={{ fontSize: '20px' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                onClick={() => deleteConfirm(pod.podName)}
                                sx={{ width: '20px', height: '20px', marginLeft: '5px' }}
                              >
                                <DeleteForeverIcon sx={{ fontSize: '20px' }} />
                              </IconButton>
                            </Tooltip>
                          </CardActions>
                        ) : (
                          <></>
                        )}
                      </Card>
                    ) : (
                      <></>
                    ),
                  )}
                </TabPanel>
              )
            }
            {
              pods.length > 0 && (
                <TabPanel value="2" sx={{ padding: 0 }}>
              {pods.map((pod) =>
                pod.isShared ? (
                  <Card
                    sx={{ maxWidth: 345, margin: '5px' }}
                    style={{ backgroundColor: '#0000ff05' }}
                  >
                    <CardContent sx={{ padding: '0px' }}>
                      <Typography gutterBottom sx={{ textAlign: 'left' }}>
                        <Tooltip
                          title={
                            pod.isMounted ? 'Unmount this pod' : 'Mount this pod'
                          }
                        >
                          <Checkbox
                            onChange={mount}
                            value={pod.podName}
                            color="primary"
                            disabled={isLoading}
                            checked={pod.isMounted}
                          />
                        </Tooltip>
                        {pod.podName.length > 20
                          ? pod.podName.slice(0, 12) +
                            '....' +
                            pod.podName.slice(-12)
                          : pod.podName}
                      </Typography>
                    </CardContent>
                    {pod.isMounted ? (
                      <CardActions sx={{ justifyContent: 'end' }}>
                        <Tooltip title="Open">
                          <IconButton
                            onClick={() => EventsEmit('open', pod.mountPoint)}
                            sx={{ width: '20px', height: '20px', marginLeft: '5px' }}
                          >
                            <OpenInNewIcon sx={{ fontSize: '20px' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={pod.mountPoint}>
                          <IconButton
                            onClick={() => copyUrlToClipboard(pod.mountPoint)}
                            sx={{ width: '20px', height: '20px', marginLeft: '5px' }}
                          >
                            <ContentCopyIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Sync contents">
                          <IconButton
                            onClick={() => sync(pod.podName)}
                            disabled={isLoading}
                            sx={{ width: '20px', height: '20px', marginLeft: '5px' }}
                          >
                            <CloudSyncIcon sx={{ fontSize: '20px' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Share pod">
                          <IconButton
                            onClick={() => share(pod.podName)}
                            disabled={isLoading}
                            sx={{ width: '20px', height: '20px', marginLeft: '5px' }}
                          >
                            <ShareIcon sx={{ fontSize: '20px' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Fork">
                          <IconButton
                            onClick={() => fork(pod.podName)}
                            sx={{ width: '20px', height: '20px', marginLeft: '5px' }}
                          >
                            <AltRouteIcon sx={{ fontSize: '20px' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            onClick={() => deleteConfirm(pod.podName)}
                            sx={{ width: '20px', height: '20px', marginLeft: '5px' }}
                          >
                            <DeleteForeverIcon sx={{ fontSize: '20px' }} />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    ) : (
                      <></>
                    )}
                  </Card>
                ) : (
                  <></>
                ),
              )}
            </TabPanel>
              )
            }
            {
              subscribedPods.length > 0 && (
                <TabPanel value="3" sx={{ padding: 0 }}>
                  {subscribedPods.map((pod) =>
                    <Card
                      sx={{ maxWidth: 345, margin: '5px' }}
                      style={{ backgroundColor: '#0000ff05' }}
                    >
                      <CardContent sx={{ padding: '0px' }}>
                        <Typography gutterBottom sx={{ textAlign: 'left' }}>
                          <Tooltip
                            title={
                              pod.isMounted ? 'Unmount this pod' : 'Mount this pod'
                            }
                          >
                            <Checkbox
                              onChange={mountSubscribedPods}
                              value={pod.subHash}
                              color="primary"
                              disabled={isLoading}
                              checked={pod.isMounted}
                            />
                          </Tooltip>
                          {pod.podName.length > 20
                            ? pod.podName.slice(0, 12) +
                            '....' +
                            pod.podName.slice(-12)
                            : pod.podName}
                          <p>{categoriesMap[pod.category]}</p>
                        </Typography>
                      </CardContent>
                      {pod.isMounted ? (
                        <CardActions sx={{ justifyContent: 'end' }}>
                          <Tooltip title="Open">
                            <IconButton
                              onClick={() => EventsEmit('open', pod.mountPoint)}
                              sx={{ width: '20px', height: '20px', marginLeft: '5px' }}
                            >
                              <OpenInNewIcon sx={{ fontSize: '20px' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={pod.mountPoint}>
                            <IconButton
                              onClick={() => copyUrlToClipboard(pod.mountPoint)}
                              sx={{ width: '20px', height: '20px', marginLeft: '5px' }}
                            >
                              <ContentCopyIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Sync contents">
                            <IconButton
                              onClick={() => sync(pod.podName)}
                              disabled={isLoading}
                              sx={{ width: '20px', height: '20px', marginLeft: '5px' }}
                            >
                              <CloudSyncIcon sx={{ fontSize: '20px' }} />
                            </IconButton>
                          </Tooltip>
                        </CardActions>
                      ) : (
                        <></>
                      )}
                    </Card>
                  )}
                </TabPanel>
              )
            }
          </TabContext>
        </Box>
      </Container>

      <DeleteConfirmComponent
        isLoading={isLoading}
        isOpen={showDeleteConfirm}
        onClose={handleDeleteClose}
        podName={podToDelete}
        onSuccess={onSuccess}
        onError={onError}
        showLoader={showLoader}
      />

      <SharedReferenceComponent
        isOpen={showSharedReference}
        onClose={handleSharedReferenceClose}
        podName={sharedPodName}
        reference={sharedReference}
      />

      <ForkPodComponent
        podName={podToFork}
        isOpen={showPodFork}
        isLoading={isLoading}
        onClose={handlePodForkClose}
        showLoader={showLoader}
        onError={onError}
        onSuccess={onSuccess}
      />
    </>
  )
}

export default PodsComponent