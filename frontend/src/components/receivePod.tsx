import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useState } from "react";
import { CreatePod, GetPodsList, ReceivePod } from "../../wailsjs/go/handler/Handler";

export interface PodOpsProps {
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onSuccess: () => void
  onError: (arg0: string) => void
  showLoader: (arg0: boolean) => void
}

function ReceivePodComponent(props: PodOpsProps) {
  const [newPodName, setNewPodName] = useState('')
  const [reference, setReference] = useState('')
  const updateNewPodName = (e: any) => {
    setNewPodName(e.target.value)
  }
  const updateReference = (e: any) => {
    setReference(e.target.value)
  }
  const handlePodReceive = async () => {
    props.showLoader(true)
    try {
      if (newPodName === '') {
        props.onError("pod name cannot be empty")
      } else if (reference === '') {
        props.onError("reference cannot be empty")
      } else {
        await ReceivePod(reference, newPodName)
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
    <Dialog open={props.isOpen} onClose={props.onClose}>
      <Tooltip title="Imagine POD is one of your drives">
        <DialogTitle>
          Receive/Import Pod
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
            <CloseIcon/>
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
      </DialogContent>
      <DialogActions>
        <Button
          onClick={props.onClose}
          disabled={props.isLoading}
          variant="contained"
        >
          Close
        </Button>
        <Button
          onClick={handlePodReceive}
          disabled={props.isLoading}
          variant="contained"
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ReceivePodComponent