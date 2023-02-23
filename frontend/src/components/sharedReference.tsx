import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { copyUrlToClipboard } from "../utils/copyToClipboard";

interface SharedReferenceProps {
  isOpen: boolean
  onClose: () => void
  podName: string
  reference: string
}

function SharedReferenceComponent(props: SharedReferenceProps) {
  return (
    <Dialog
      aria-labelledby="delete-confirm" open={props.isOpen}
    >
      <DialogTitle>
        Shared {props.podName}
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
      <DialogContent dividers>
        <Typography>
          <Typography sx={{
            wordWrap: 'break-word' }}>{props.reference}</Typography>
          <Tooltip title="Copy reference">
            <IconButton
              onClick={() =>
                copyUrlToClipboard(props.reference)
              }
              sx={{ width: "20px", height: "20px", marginLeft: "15px" }}
            >
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
          <p>
            This reference can be used to share {props.podName}.
            Others can use this reference to receive/import the content of this pod
          </p>

        </Typography>
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={props.onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SharedReferenceComponent