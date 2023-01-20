import {
  Button,
  Dialog, DialogContent,
  DialogTitle,
  FormGroup,
  IconButton,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import React from "react";
import CloseIcon from "@mui/icons-material/Close";

interface AccountDetailsProps {
  isOpen: boolean
  onClose: () => void
  username: string
  password: string
  mnemonic: string
  privateKey: string
}

function AccountDetailsComponent(
  {
    isOpen,
    onClose,
    username,
    password,
    mnemonic,
    privateKey
  }: AccountDetailsProps) {
  return (
    <Dialog aria-labelledby="about" open={isOpen} onClose={onClose}>
      <DialogTitle>
        Account Details
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
        {username === '' ? (
          <Tooltip title="Seems like there is no account information">
            <Typography>No account info</Typography>
          </Tooltip>
        ) : (
          <>
            <Typography>
              <strong>{username}</strong>
            </Typography>
            <Typography>Password</Typography>
            <span style={{ color: 'transparent', textShadow: '0 0 15px #000' }}>
                  <strong>{password}</strong>
                </span>
            <br />
            {mnemonic != '' ? (
              <>
                <Typography>
                  This is Lite account
                </Typography>
                <br />
                <Typography>Mnemonic</Typography>
                <span
                  style={{ color: 'transparent', textShadow: '0 0 15px #000' }}
                >
                      <strong>{mnemonic}</strong>
                    </span>

                <Typography>Private Key</Typography>
                <span
                  style={{ color: 'transparent', textShadow: '0 0 15px #000' }}
                >
                      <strong style={{ fontSize: '8px' }}>{privateKey}</strong>
                    </span>
              </>
            ) : (
              <Typography>
                This is Portable account
              </Typography>
            )}
            <br />
          </>
        )}
        <FormGroup>
          <Stack mt={3} mb={3} spacing={2} direction="row">
            <Tooltip title="Closes this dialog">
              <Button
                fullWidth
                variant="outlined"
                onClick={onClose}
              >
                Close
              </Button>
            </Tooltip>
          </Stack>
        </FormGroup>
      </DialogContent>
    </Dialog>
  )
}

export default AccountDetailsComponent