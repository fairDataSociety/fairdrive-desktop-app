import logo from "../assets/images/fairdata.svg";
import {
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  FormGroup, Link,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { openSignUp } from "../utils/openBrowser";
import { EventsEmit } from "../../wailsjs/runtime";
import { useSDK } from "@metamask/sdk-react";
import React, { useState } from "react";

const SIGN_WALLET_ADDRESS_DATA = `I am granting FULL ACCESS to the FDP account for address: {address}`;

interface LoginProps {
  isLoading: boolean
  updateUsername: (e: any) => void
  updatePassword: (e: any) => void
  updateRemember: (e: any) => void
  login: () => void
  loginWithSignature: (signature: string, password: string) => void
  showLoader: (arg0: boolean) => void
}

function LoginComponent({isLoading, updateUsername, updatePassword, updateRemember, login, loginWithSignature, showLoader}: LoginProps) {
  const [account, setAccount] = useState<string>();
  const { sdk, connected, connecting, provider, chainId } = useSDK();
  const connect = async () => {
    try {
      showLoader(true)
      const accounts = await sdk?.connect();
      showLoader(false)

      // @ts-ignore
      setAccount(accounts?.[0]);
      // @ts-ignore
      const signature: string = await sdk?.connectAndSign({msg : getSignWalletData(accounts?.[0])})
      console.log("signature", signature)
      showLoader(true)

      loginWithSignature(signature, "passwordpassword")
      showLoader(false)

    } catch (err) {
      console.warn("failed to connect..", err);
    }
  };
  function getSignWalletData(address: string): string {
    if (address == "") {
      throw new Error('Address is not a valid');
    }

    return SIGN_WALLET_ADDRESS_DATA.replace('{address}', address.toLowerCase());
  }
  return (
    <>
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <img
            src={logo}
            id="logo"
            alt="logo"
            className="logo-icon"
            onClick={() => EventsEmit('showAccounts')}
            style={{ height: '80%', cursor: 'pointer' }}
          />
          <Tooltip
            title="You can use Fair Data Society Portable account if you have one, or create Lite account by simply entering username/password and new account will be auto-magically created for you."
            placement="top"
          >
            <h2>Fairdrive login</h2>
          </Tooltip>
          <FormGroup sx={{ marginBottom: '50px' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              onChange={updateUsername}
              autoComplete="off"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  login()
                }
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="password"
              label="Password"
              onChange={updatePassword}
              autoComplete="off"
              type="password"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  login()
                }
              }}
            />
            <FormControlLabel
              control={<Checkbox color="primary" onChange={updateRemember} />}
              label={
                <Tooltip
                  title="This will also add information to a list of available accounts for faster switching"
                  placement="top"
                >
                  <Typography>Remember my login</Typography>
                </Tooltip>
              }
            />
            <Tooltip title="This app supports Lite and Portable FDS accounts. Enter your credentials and login">
              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 3, mb: 2 }}
                onClick={login}
                disabled={isLoading}
              >
                Login
              </Button>
            </Tooltip>
            <>
              <Tooltip
                title="Lite account exists on local machine only. You can upgrade it to Portable FDS account using mnemonic later. Just enter username/password and new account will be auto-magically created. When logged in see information about it in 'File -> Account details.' "
                placement="bottom"
              >
                <Typography align="center">What is Lite account?</Typography>
              </Tooltip>
            </>
            <>
              <br />
              <Typography>
                <Tooltip title="Portable accounts can be used in web browsers, FairOS and in any app supporting FairDataProtocol with all the goodies provided by FDP. They require a balance.">
                  <span>Need Advanced features ? </span>
                </Tooltip>
                <Tooltip
                  title="Sign up for Portable FDS account."
                  placement="bottom"
                >
                  <Link href="#" variant="body2" onClick={openSignUp} align="center">
                    Sign Up
                  </Link>
                </Tooltip>
              </Typography>
            </>
            <>
              <br />
              <Tooltip
                title="Metamask"
                placement="bottom"
              >
                <Link href="#" variant="body2" onClick={connect} align="center">
                  Connect with Metamask
                </Link>
              </Tooltip>
            </>
          </FormGroup>
        </Box>
      </Container>
    </>
  )
}

export default LoginComponent