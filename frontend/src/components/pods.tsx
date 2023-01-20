import {
  Box,
  Checkbox,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
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
import { useState } from "react";
import { SharePod, Sync } from "../../wailsjs/go/handler/Handler";
import SharedReferenceComponent from "./sharedReference";
import ForkPodComponent from "./forkPod";
import DeleteConfirmComponent from "./deleteConfirm";
import PodMountedInfo = handler.PodMountedInfo;

interface PodProps {
  pods: PodMountedInfo[]
  username: string
  mnemonic: string
  onError: (arg0: string) => void
  setShowAccounts: (arg: boolean) => void
  showLoader: (arg: boolean) => void
  isLoading: boolean
  onSuccess: () => void
  mount: (e: any) => void
}

function PodsComponent(
  {
    mount,
    onSuccess,
    isLoading,
    onError,
    pods,
    username,
    mnemonic,
    setShowAccounts,
    showLoader
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
      console.log(ref)
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

  return (
    <>
      <Container component="main" maxWidth="xs">
        <Tooltip
          title="Existing pods are listed here. You can mount and unmount them, and they will auto-magically appear in your filesystem at mount point.">
          <h2 style={{ marginBottom: '0px' }}>Pods</h2>
        </Tooltip>
        <Tooltip
          title={
            "Currently logged in with account '" +
            username +
            "'. Click to display accounts."
          }>
          <Typography
            style={{ color: 'gray' }}
            onClick={() => setShowAccounts(true)}>
            {username}
          </Typography>
        </Tooltip>
        <Tooltip
          title={
            'This is ' +
            (mnemonic === '' || mnemonic === undefined
              ? 'portable'
              : 'lite') +
            ' account'
          }>
          <Typography style={{ color: 'gray', fontSize: '8px' }}>
            {mnemonic === '' || mnemonic === undefined
              ? 'portable'
              : 'lite'}
          </Typography>
        </Tooltip>
        <Box
          sx={{
            width: '100%',
            maxWidth: 360,
          }}>
          <List
            subheader={
              <ListSubheader
                sx={{ bgcolor: 'transparent' }}>
                Private
              </ListSubheader>
            }>
            {pods.map((pod) =>
              !pod.isShared ?
                pod.isMounted ?
                  <ListItem
                    key={pod.podName}
                    secondaryAction={
                      <div>
                        <Tooltip title="Share pod">
                          <IconButton
                            onClick={() => share(pod.podName)}
                            disabled={isLoading}
                            sx={{ width: "20px", height: "20px", marginLeft: "5px" }}
                          >
                            <ShareIcon sx={{ fontSize: "20px" }}/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Sync contents">
                          <IconButton
                            onClick={() => sync(pod.podName)}
                            disabled={isLoading}
                            sx={{ width: "20px", height: "20px", marginLeft: "5px" }}
                          >
                            <CloudSyncIcon sx={{ fontSize: "20px" }}/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={pod.mountPoint}>
                          <IconButton
                            onClick={() =>
                              copyUrlToClipboard(pod.mountPoint)
                            }
                            sx={{ width: "20px", height: "20px", marginLeft: "5px" }}
                          >
                            <ContentCopyIcon/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Open">
                          <IconButton
                            onClick={() =>
                              EventsEmit('open', pod.mountPoint)
                            }
                            sx={{ width: "20px", height: "20px", marginLeft: "5px" }}
                          >
                            <OpenInNewIcon sx={{ fontSize: "20px" }}/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Fork">
                          <IconButton
                            onClick={() =>
                              fork(pod.podName)
                            }
                            sx={{ width: "20px", height: "20px", marginLeft: "5px" }}
                          >
                            <AltRouteIcon sx={{ fontSize: "20px" }}/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            onClick={() =>
                              deleteConfirm(pod.podName)
                            }
                            sx={{ width: "20px", height: "20px", marginLeft: "5px" }}
                          >
                            <DeleteForeverIcon sx={{ fontSize: "20px" }}/>
                          </IconButton>
                        </Tooltip>
                      </div>
                    }
                    disablePadding
                  >
                    <ListItemButton>
                      <ListItemIcon>
                        <Tooltip
                          title={
                            pod.isMounted
                              ? 'Unmount this pod'
                              : 'Mount this pod'
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
                      </ListItemIcon>
                      <ListItemText
                        primary={pod.podName}
                      />
                    </ListItemButton>
                  </ListItem>
                  :
                  <ListItem key={pod.podName} disablePadding>
                    <ListItemButton>
                      <ListItemIcon>
                        <Tooltip
                          title={
                            pod.isMounted
                              ? 'Unmount this pod'
                              : 'Mount this pod'
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
                      </ListItemIcon>
                      <ListItemText
                        primary={pod.podName}
                      />
                    </ListItemButton>
                  </ListItem> :<></>
            )}
          </List>
          <List
            subheader={
              <ListSubheader sx={{ bgcolor: 'transparent' }}>
                Shared
              </ListSubheader>
            }>
            {pods.map((pod) =>
              pod.isShared ?
                pod.isMounted ?
                  <ListItem
                    key={pod.podName}
                    secondaryAction={
                      <div>
                        <Tooltip title="Share pod">
                          <IconButton
                            onClick={() => share(pod.podName)}
                            disabled={isLoading}
                          >
                            <ShareIcon/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Sync contents">
                          <IconButton
                            onClick={() => sync(pod.podName)}
                            disabled={isLoading}
                          >
                            <CloudSyncIcon/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={pod.mountPoint}>
                          <IconButton
                            onClick={() =>
                              copyUrlToClipboard(pod.mountPoint)
                            }
                          >
                            <ContentCopyIcon/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Open">
                          <IconButton
                            onClick={() =>
                              EventsEmit('open', pod.mountPoint)
                            }
                          >
                            <OpenInNewIcon/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Fork">
                          <IconButton
                            onClick={() =>
                              fork(pod.podName)
                            }
                          >
                            <AltRouteIcon/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            onClick={() =>
                              deleteConfirm(pod.podName)
                            }
                          >
                            <DeleteForeverIcon/>
                          </IconButton>
                        </Tooltip>
                      </div>
                    }
                    disablePadding
                  >
                    <ListItemButton>
                      <ListItemIcon>
                        <Tooltip
                          title={
                            pod.isMounted
                              ? 'Unmount this pod'
                              : 'Mount this pod'
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
                      </ListItemIcon>
                      <ListItemText
                        primary={pod.podName}
                      />
                    </ListItemButton>
                  </ListItem> :
                  <ListItem key={pod.podName} disablePadding>
                    <ListItemButton>
                      <ListItemIcon>
                        <Tooltip
                          title={
                            pod.isMounted
                              ? 'Unmount this pod'
                              : 'Mount this pod'
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
                      </ListItemIcon>
                      <ListItemText
                        primary={pod.podName}
                      />
                    </ListItemButton>
                  </ListItem> :<></>
            )}
          </List>
        </Box>
      </Container>

      <DeleteConfirmComponent
        isLoading={isLoading}
        isOpen={showDeleteConfirm}
        onClose={handleDeleteClose}
        podName={podToDelete}
        onSuccess={onSuccess}
        onError={onError}
        showLoader={showLoader}/>

      <SharedReferenceComponent
        isOpen={showSharedReference}
        onClose={handleSharedReferenceClose}
        podName={sharedPodName}
        reference={sharedReference}/>

      <ForkPodComponent
        podName={podToFork}
        isOpen={showPodFork}
        isLoading={isLoading}
        onClose={handlePodForkClose}
        showLoader={showLoader}
        onError={onError}
        onSuccess={onSuccess}/>
    </>
  )
}

export default PodsComponent