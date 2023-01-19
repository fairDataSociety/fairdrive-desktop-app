import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { DeletePod } from "../../wailsjs/go/handler/Handler";

export interface DeleteProps {
  isLoading: boolean
  isOpen: boolean
  onClose: () => void
  onError:(arg0: string) => void
  onSuccess: () => void
  showLoader: (arg0: boolean) => void
  podName: string
}

function DeleteConfirmComponent(props: DeleteProps) {
  async function deletePod() {
    props.showLoader(true)
    try {
      await DeletePod(props.podName)
      await props.onSuccess()
      props.onClose()
    } catch (e) {
      props.onError(String(e))
    }
    props.showLoader(false)
  }

  return (
    <Dialog
      aria-labelledby="delete-confirm" open={props.isOpen}
    >
      <DialogTitle>Delete {props.podName}</DialogTitle>
      <DialogContent dividers>
        <Typography>This action is irreversible. Are you Sure? </Typography>
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={props.onClose} disabled={props.isLoading}>
          Cancel
        </Button>
        <Button onClick={deletePod} disabled={props.isLoading}>Ok</Button>
      </DialogActions>
    </Dialog>
  );
}

export default DeleteConfirmComponent