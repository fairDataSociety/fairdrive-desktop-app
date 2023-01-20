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

interface LoginProps {
  isLoading: boolean
  updateUsername: (e: any) => void
  updatePassword: (e: any) => void
  updateRemember: (e: any) => void
  login: () => void
}
function LoginComponent({isLoading, updateUsername, updatePassword, updateRemember, login}: LoginProps) {

  return (
    <>
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: '100vh',
          }}
        >
          <img
            src={logo}
            id="logo"
            alt="logo"
            className="logo-icon"
            onClick={() => EventsEmit("showAccounts")}
          />
          <FormGroup sx={{marginBottom: '50px'}}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              onChange={updateUsername}
              autoComplete="off"
              autoFocus
              onKeyDown={event => {
                if (event.key === "Enter") {
                  login();
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
              onKeyDown={event => {
                if (event.key === "Enter") {
                  login();
                }
              }}
            />
            <FormControlLabel
              control={
                <Checkbox color="primary" onChange={updateRemember} />
              }
              label={
                <Tooltip
                  title="This will also add information to a list of available accounts for faster switching"
                  placement="top"
                >
                  <Typography>Remember and keep me logged-in</Typography>
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
                <Typography
                  align="center"
                >
                  What is Lite account?
                </Typography>
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
                  <Link
                    href="#"
                    variant="body2"
                    onClick={openSignUp}
                    align="center"
                  >
                    Sign Up
                  </Link>
                </Tooltip>
              </Typography>
            </>
          </FormGroup>
        </Box>
      </Container>
    </>
  )
}

export default LoginComponent