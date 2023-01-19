import { Box, Button, Container, Tooltip, Typography } from "@mui/material";
import { EventsEmit } from "../../wailsjs/runtime";
import React from "react";

interface EmptyPods {
  username: string
  mnemonic: string
  isLoading: boolean
  setShowAccounts: (arg: boolean)=>void
}

function EmptyPodsComponent({username, mnemonic, isLoading, setShowAccounts}: EmptyPods) {
  return (
    <Container component="main" maxWidth="xs">
      <Tooltip
        title="Existing pods are listed here. You can mount and unmount them, and they will auto-magically appear in your filesystem at mount point.">
        <h2 style={{ color: 'black', marginBottom: '0px' }}>Pods</h2>
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
          bgcolor: 'background.paper',
        }}>
        <br/>
        <Typography
          gutterBottom
          align="center"
          style={{ color: 'black' }}>
          Still do not have pods?
        </Typography>

        <Button
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          onClick={() => EventsEmit('disableMenus')}
          disabled={isLoading}
        >
          Create Pod
        </Button>
      </Box>
    </Container>
  )
}

export default EmptyPodsComponent