import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle, FormGroup,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import React from "react";

interface ImportAccountProps {
  isOpen: boolean
  onClose: () => void
  updateImportName: (e: any) => void
  updateImportPassword: (e: any) => void
  updateImportMnemonic: (e: any) => void
  importAccount: () => void
}

function ImportAccountComponent(
  {
    isOpen,
    onClose,
    updateImportName,
    updateImportPassword,
    updateImportMnemonic,
    importAccount
  }: ImportAccountProps) {
  return (
    <>
      <Dialog aria-labelledby="about" open={isOpen} onClose={onClose}>
        <DialogTitle>
          Import Account
          <IconButton
            aria-label="close"
            onClick={onClose}
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
          <FormGroup>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              onChange={updateImportName}
              autoComplete="off"
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="password"
              label="Password"
              onChange={updateImportPassword}
              autoComplete="off"
              type="password"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              multiline
              id="mnemonic"
              label="12-word mnemonic"
              onChange={updateImportMnemonic}
              autoComplete="off"
              type="password"
            />
            <Stack mt={3} mb={3} spacing={2} direction="row">
              <Tooltip title="Closes this dialog">
                <Button
                  fullWidth
                  variant="contained"
                  onClick={onClose}
                >
                  Close
                </Button>
              </Tooltip>
              <Tooltip title="Import account, logs in and stores account to accounts list">
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => importAccount()}
                >
                  Import
                </Button>
              </Tooltip>
            </Stack>
          </FormGroup>
        </DialogContent>
      </Dialog>

    </>
  )
}

export default ImportAccountComponent