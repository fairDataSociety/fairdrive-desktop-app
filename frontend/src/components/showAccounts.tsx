import {
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  Tooltip,
  Typography
} from "@mui/material";
import React from "react";
import { AccountInfo } from "../types/info";
import CloseIcon from "@mui/icons-material/Close";

interface ShowAccountsProps {
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  accounts: AccountInfo[]
  handleAccountSwitch: (arg: AccountInfo) => void
  handleAccountRemove: (arg: AccountInfo) => void
}

function ShowAccountsComponent(
  {
    isOpen,
    onClose,
    isLoading,
    accounts,
    handleAccountSwitch,
    handleAccountRemove,
  }: ShowAccountsProps) {
  return (
    <Dialog open={isOpen} fullWidth>
      <DialogTitle>
        Accounts
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
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {accounts.length === 0 && (
        <>
          <Typography style={{ color: 'black', margin: '20px' }}>
            No accounts found
          </Typography>
          <Typography style={{ color: 'gray', margin: '20px' }}>
            To add account to this list, click on "Remember me" checkbox before
            login. Accounts do not know about your connection preferences. Lite
            accounts are added automatically.
          </Typography>
        </>
      )}
      <List>
        {accounts.map((account) => (
          <ListItem key={account.userInfo.username} disabled={isLoading}>
            <Tooltip title="Click to switch" placement="left">
              <Typography
                onClick={() => handleAccountSwitch(account)}
                style={{ cursor: 'pointer' }}
                className="account-switch"
              >
                {account.userInfo.username}&nbsp;&nbsp;&nbsp;&nbsp;
                {/* {account.userInfo.mnemonic} */}
              </Typography>
            </Tooltip>
            <span
              style={{
                fontSize: '8px',
                position: 'absolute',
                left: '16px',
                top: '1.6rem',
              }}
            >
              {account.userInfo.mnemonic !== undefined ||
              account.userInfo.mnemonic === ''
                ? 'lite'
                : 'portable'}
            </span>

            <Tooltip title="Remove account" placement="top">
              <Typography
                onClick={() => handleAccountRemove(account)}
                style={{
                  cursor: 'pointer',
                  position: 'absolute',
                  right: '5px',
                  top: '6px',
                }}
              >
                x
              </Typography>
            </Tooltip>
          </ListItem>
        ))}
      </List>
      {/* <ListItem key = {account.userInfo.username} onClick={() => handleAccountSwitch(account)}> */}
      <DialogActions
        style={{ justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Button
          onClick={onClose}
          disabled={isLoading}
          variant="outlined"
          style={{
            width: '100%',
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ShowAccountsComponent