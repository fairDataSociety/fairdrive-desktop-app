import { Alert, Snackbar } from "@mui/material";
import { AlertProps } from "./about";

function Disclaimer(props: AlertProps) {
  return (
    <Snackbar
      open={props.isOpen}
      onClose={() => props.onClose()}
      autoHideDuration={15000}
    >
      <Alert onClose={() => props.onClose()}>
        ⚠ Fairdrive is in Beta and provided for evaluation only! File integrity
        persistence and security are not assured! Expect that data in Fairdrive
        can be deleted at any time.
      </Alert>
    </Snackbar>
  )
}

export default Disclaimer