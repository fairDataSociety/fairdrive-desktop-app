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
import { CreatePod, Fork, GetPodsList } from "../../wailsjs/go/handler/Handler";

export interface ForkPodOpsProps {
  podName: string
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onSuccess: () => void
  onError: (arg0: string) => void
  showLoader: (arg0: boolean) => void
}

function ForkPodComponent(props: ForkPodOpsProps) {
  const [newPodName, setNewPodName] = useState('')
  const updateNewPodName = (e: any) => {
    setNewPodName(e.target.value)
  }
  const handlePodFork = async () => {
    props.showLoader(true)
    try {
      if (newPodName !== '') {
        await Fork(props.podName, newPodName)
        setNewPodName('')
        await props.onSuccess()
        props.onClose()
      } else {
        props.onError("fork name cannot be empty")
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
          Fork {props.podName}
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
        <Typography>
          <p>
            Fork will create a new pod from {props.podName}. This process can take some based on the contents in the pod. Please do not close the app while fork is in progress.
          </p>
        </Typography>
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
          onClick={handlePodFork}
          disabled={props.isLoading}
          variant="contained"
        >
          Fork
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ForkPodComponent