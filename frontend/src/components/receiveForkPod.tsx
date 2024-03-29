import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip, Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useState } from "react";
import { ForkFromReference } from "../../wailsjs/go/handler/Handler";

export interface PodOpsProps {
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onSuccess: () => void
  onError: (arg0: string) => void
  showLoader: (arg0: boolean) => void
}

function ReceiveForkPodComponent(props: PodOpsProps) {
  const [newPodName, setNewPodName] = useState('')
  const [reference, setReference] = useState('')
  const updateNewPodName = (e: any) => {
    setNewPodName(e.target.value)
  }
  const updateReference = (e: any) => {
    setReference(e.target.value)
  }
  const handlePodForkReceive = async () => {
    props.showLoader(true)
    try {
      if (newPodName === '') {
        props.onError("pod name cannot be empty")
      } else if (reference === '') {
        props.onError("reference cannot be empty")
      } else {
        await ForkFromReference(newPodName, reference)
        setNewPodName('')
        await props.onSuccess()
        props.onClose()
      }
    } catch (e: any) {
      props.onError(String(e))
    }
    props.showLoader(false)
  }
  return (
    <Dialog open={props.isOpen} onClose={props.onClose} fullWidth>
      <Tooltip title="Forking a pod from reference creates a new pod and copies content from shared pod reference. Forked pod becomes your private pod and can be written to, contents are synced only when forking is done.">
        <DialogTitle>
          Duplicate from Reference
          <IconButton
            aria-label="close"
            onClick={props.onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
      </Tooltip>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="podName"
          label="Pod Name"
          fullWidth
          variant="standard"
          onChange={updateNewPodName}
        />
        <TextField
          autoFocus
          margin="dense"
          id="reference"
          label="Reference"
          fullWidth
          variant="standard"
          onChange={updateReference}
        />
        <br />
        <br />
        <Typography>
          <small>
            Duplicating from reference will create a new pod from the given
            reference. This process can take some time based on the contents in the pod.
          </small>
        </Typography>
        <br />
        <Typography>
          <small>
            <strong>DO NOT CLOSE the app while fork is in progress. </strong>
          </small>
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={props.onClose}
          disabled={props.isLoading}
          variant="outlined"
        >
          Close
        </Button>
        <Button
          onClick={handlePodForkReceive}
          disabled={props.isLoading}
          variant="outlined"
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ReceiveForkPodComponent