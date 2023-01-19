import { Alert, Snackbar } from "@mui/material";
import { useState } from "react";

interface Props {
  errorMessage: string;
  open: boolean
  show: (arg0: boolean) => void
}

export function ErrorSnack({ errorMessage, open, show } : Props) {
  const handleCloseError = () => {
    show(false);
  };

  return (
    <Snackbar
      open={open}
      onClose={handleCloseError}
      autoHideDuration={7000}
    >
      <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
        {errorMessage}
      </Alert>
    </Snackbar>
  )
}