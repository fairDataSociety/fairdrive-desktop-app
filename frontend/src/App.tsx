import { forwardRef, SyntheticEvent, useEffect, useState } from 'react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import logo from './assets/images/fairdata.svg'
import dfLogo from './assets/images/datafund.svg'
import backgroundImage from './assets/images/sculptures_of_data_s.jpg'

import './App.css'
import {
  Login,
  Mount,
  GetPodsList,
  Unmount,
  Start,
  Close,
  Logout,
  CreatePod,
  GetCashedPods,
  Load,
} from '../wailsjs/go/handler/Handler'
import {
  SetupConfig,
  IsSet,
  GetConfig,
  GetMountPoint,
  GetAutoMount,
  GetMountedPods,
} from '../wailsjs/go/main/conf'
import {
  RememberPassword,
  HasRemembered,
  ForgetPassword,
  Get,
} from '../wailsjs/go/main/Account'
import {
  TextField,
  Button,
  Checkbox,
  FormGroup,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  Radio,
  MenuItem,
  Select,
  Container,
  Box,
  Grid,
  Link,
  Modal,
  Tooltip,
  IconButton,
  Stack,
  Snackbar,
  AlertProps,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  styled,
  DialogActions,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import MuiAlert from '@mui/material/Alert'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { api, handler } from '../wailsjs/go/models'
import { BrowserOpenURL, EventsEmit, EventsOn } from '../wailsjs/runtime'
import { Folder } from '@mui/icons-material'
import CloseIcon from '@mui/icons-material/Close'
import { BuildTime, Version } from '../wailsjs/go/main/about'
import PodMountedInfo = handler.PodMountedInfo

interface UserInfo {
  username: string | any
  password: string | any
}

interface AccountInfo {
  userInfo: UserInfo[] | any
  pods: PodMountedInfo[] | any
}

function createUserInfo(username: string, password: string): UserInfo {
  return { username, password }
}

function addAccount(userInfo: UserInfo, pods: PodMountedInfo[]): AccountInfo {
  return { userInfo, pods }
}

function createAccountInfo(
  username: string,
  password: string,
  pods: PodMountedInfo[],
): AccountInfo {
  return { userInfo: createUserInfo(username, password), pods }
}

const theme = createTheme({
  typography: {
    fontFamily: `"WorkSans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
    "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
    sans-serif`,
  },
})
const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
})

const AboutDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1),
  },
}))

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [openError, setOpenError] = useState(false)
  const [openInfo, setOpenInfo] = useState(false)

  const handleCloseError = (event?: SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return
    }

    setOpenError(false)
  }
  const handleCloseInfo = (event?: SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return
    }

    setOpenInfo(false)
  }

  const [showAbout, setShowAbout] = useState<boolean>(false)
  const handleAboutClose = () => {
    setShowAbout(false)
  }

  const [showPodNew, setPodNew] = useState<boolean>(false)
  const handlePodNewClose = () => {
    setPodNew(false)
  }
  const [newPodName, setNewPodName] = useState('')

  const handlePodNew = async () => {
    setIsLoading(true)
    try {
      if (newPodName !== '') {
        await CreatePod(newPodName)
        setPodNew(false)
        setNewPodName('')
        let p = await GetPodsList()
        setPods(p)
        setShowPods(true)
      }
    } catch (e: any) {
      showError(e)
    }
    setIsLoading(false)
  }

  const [version, setVersion] = useState('')
  const [buildTime, setTime] = useState('')

  const [showConfig, setShowConfig] = useState<boolean>(false)
  const [showLogin, setShowLogin] = useState<boolean>(true)
  const [showPods, setShowPods] = useState<boolean>(true)

  const [showAccounts, setShowAccounts] = useState<boolean>(false)

  const [username, setName] = useState('')
  const [password, setPassword] = useState('')
  const [mnemonic, setMnemonic] = useState('')
  const [remember, setRemember] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState('') // error message
  const [infoMessage, setInfoMessage] = useState('') // info messages

  async function LoadStoredAccounts() {
    let storedAccounts = localStorage.getItem('accounts')
    if (storedAccounts !== null) {
      setAccounts(JSON.parse(storedAccounts))
    }
  }

  useEffect(() => {
    LoadStoredAccounts()
    EventsOn('preferences', () => {
      setShowConfig(true)
    })
    EventsOn('showAccounts', () => {
      setShowAccounts(true)
    })
    EventsOn('podNew', () => {
      setPodNew(true)
    })
    EventsOn('about', () => {
      setShowAbout(true)
    })
    EventsOn('mountPointSelected', (m: string) => {
      setMountPoint(m)
    })
    EventsOn('logout', async () => {
      setIsLoading(true)
      try {
        await Logout()
        EventsEmit('disableMenus')
        setShowLogin(true)
        setShowPods(false)
        setPods([])
        await ForgetPassword()
      } catch (e: any) {
        showError(e)
      }
      setIsLoading(false)
    })

    Version().then((res) => {
      setVersion(res)
    })
    BuildTime().then((res) => {
      setTime(res)
    })
    IsSet().then(async (isSet) => {
      if (!isSet) {
        setShowConfig(true)
      } else {
        let c = await GetConfig()
        if (c !== null) {
          c.isProxy ? setProxyValue('yes') : setProxyValue('no')
          setProxy(c.isProxy)
          setBee(c.bee)
          setBatch(c.batch)
          setNetwork(c.network)
          setRPC(c.rpc)
        }
        setIsLoading(true)
        try {
          await Start(c)
          let acc = await Get()
          if (acc.Username === '' || acc.Password === '') {
            EventsEmit('disableMenus')
          } else {
            await doLogin(acc.Username, acc.Password)

            let _mountPoint = await GetMountPoint()
            setMountPoint(_mountPoint)

            let autoMount = await GetAutoMount()
            if (autoMount) {
              let mountedPods = await GetMountedPods()
              if (mountedPods != null) {
                mountedPods.map(async (pod) => {
                  await Mount(pod, _mountPoint, batch === "")
                  let pods = await GetCashedPods()
                  setPods(pods)
                })
              }
            }
            //EventsEmit('enableMenus') // if we get to the pods abd we are logged in, and got pods, then enable the menus, so that we get Logout option
          }
        } catch (e: any) {
          EventsEmit('disableMenus')
          showError(e)
        }
        setIsLoading(false)
      }
    })
    HasRemembered().then((isSet) => {
      setRemember(isSet)
    })
  }, [])
  const [pods, setPods] = useState<PodMountedInfo[]>([])
  const updateName = (e: any) => setName(e.target.value)
  const updatePassword = (e: any) => setPassword(e.target.value)
  const updateRemember = (e: any) => setRemember(e.target.checked)

  const [accounts, setAccounts] = useState<AccountInfo[]>([])

  const addAccount = async (
    username: string,
    password: string,
    pods: handler.PodMountedInfo[],
  ) => {
    const account = accounts.find((obj) => {
      return obj.userInfo.username === username
    })

    if (account === undefined) {
      let newAccountInfo = createAccountInfo(username, password, pods)
      let newAccounts = [...accounts, newAccountInfo]
      setAccounts(newAccounts)
      localStorage.setItem('accounts', JSON.stringify(newAccounts))
      return newAccountInfo
    }
    // TDOD update pod info
    return account
  }
  const removeAccount = async (account: AccountInfo) => {
    let newAccounts = accounts.filter((obj) => {
      return obj.userInfo.username !== account.userInfo.username
    })
    setAccounts(newAccounts)
    localStorage.setItem('accounts', JSON.stringify(newAccounts))
  }

  const mount = async (e: any) => {
    setIsLoading(true)
    if (e.target.checked) {
      // TODO need to check how mount point can be passed for Windows and linux
      try {
        await Mount(e.target.value, mountPoint, batch === "")
        EventsEmit('Mount')
      } catch (e: any) {
        showError(e)
      }
    } else {
      try {
        await Unmount(e.target.value)
        EventsEmit('Mount')
      } catch (e: any) {
        showError(e)
      }
    }
    let pods = await GetCashedPods()
    setPods(pods)
    setIsLoading(false)
  }
  const [mountPoint, setMountPoint] = useState('')
  const [isProxy, setProxy] = useState<boolean>(false)
  const [proxyValue, setProxyValue] = useState('no')
  const [bee, setBee] = useState('https://bee-1.dev.fairdatasociety.org')
  const [batch, setBatch] = useState('')
  const [rpc, setRPC] = useState('https://xdai.dev.fairdatasociety.org')
  const [network, setNetwork] = useState('testnet')
  const [preferencesUpdated, setPreferencesUpdated] = useState(false)
  const updateProxy = (e: any) => {
    setProxyValue(e.target.value)
    if (e.target.value === 'no') {
      setProxy(false)
    } else {
      setProxy(true)
    }

    setPreferencesUpdated(true)
  }

  const updateBee = (e: any) => {
    setBee(e.target.value)
    setPreferencesUpdated(true)
  }
  const updateBatch = (e: any) => {
    setBatch(e.target.value)
    setPreferencesUpdated(true)
  }
  const updateRPC = (e: any) => {
    setRPC(e.target.value)
    setPreferencesUpdated(true)
  }
  const updateNetwork = (e: any) => {
    setNetwork(e.target.value)
    setPreferencesUpdated(true)
  }
  const updateNewPodName = (e: any) => {
    setNewPodName(e.target.value)
    setPreferencesUpdated(true)
  }

  async function closeSettings() {
    setShowConfig(false)
    if (preferencesUpdated) {
      showInfoMessage('Preferences were updated, changes not saved.')
      setPreferencesUpdated(false)
    }
  }

  async function initFairOs() {
    setIsLoading(true)
    if (remember) {
      await Close()
    }
    let cfg: api.FairOSConfig = {
      isProxy: isProxy,
      bee: bee,
      batch: batch,
      rpc: rpc,
      network: network,
    }
    try {
      await SetupConfig(bee, batch, network, rpc, mountPoint, isProxy)
      // TODO show this some how
      // if (batch === "") {
      //   setInfoMessage('Providing No BatchID will cause mounts to be read-only')
      // }
      await Start(cfg)
      setShowConfig(false)

      if (preferencesUpdated) {
        setPreferencesUpdated(false)
        try {
          setShowAccounts(false)
          setShowLogin(true)
          setShowPods(false)
          await Logout()
          showInfoMessage('Preferences changed. Logout.')
        } catch (e: any) {
          showInfoMessage('Preferences changed.')
        }
      }
    } catch (e: any) {
      showError(e)
    }
    setIsLoading(false)
  }

  async function openSignUp() {
    BrowserOpenURL('https://create.staging.fairdatasociety.org/#/register')
  }

  async function openBrowserLicense() {
    BrowserOpenURL('https://github.com/datafund/fairos-fuse/blob/master/LICENSE')
  }
  async function openBrowserFairOS() {
    BrowserOpenURL(
      'https://docs.fairos.fairdatasociety.org/docs/fairos-dfs/api-reference',
    )
  }
  async function openBrowserFDPprotocol() {
    BrowserOpenURL('https://fdp.fairdatasociety.org/')
  }

  async function openBrowserFairDataSociety() {
    BrowserOpenURL('https://fairdatasociety.org/')
  }

  async function openBrowserDatafund() {
    BrowserOpenURL('https://datafund.io/')
  }

  async function handleAccountSwitch(account: AccountInfo) {
    setIsLoading(true)
    try {
      setShowLogin(false)
      setShowPods(false)
      setName(account.userInfo.username)
      setPassword(account.userInfo.password)
      doLogin(account.userInfo.username, account.userInfo.password)
      setShowAccounts(false)
    } catch (e: any) {
      showError(e)
      setShowLogin(true)
    }
    setIsLoading(false)
  }
  async function handleAccountRemove(account: AccountInfo) {
    setIsLoading(true)
    removeAccount(account)
    setInfoMessage('Account removed.')
    setIsLoading(false)
  }

  async function doLogin(user: string, pass: string) {
    // TODO: logout existing user and maybe unmount all pods
    try {
      await Logout()
    } catch (e: any) {
      console.log(e)
    }
    /*
    TODO change logic for load user
     */
    let m = await Load(user, pass, mnemonic)
    setMnemonic(m)
    console.log(m)
    let p = await GetPodsList()
    setShowLogin(false)
    setPods(p)
    setShowPods(true)
    EventsEmit('enableMenus')
    return p
  }

  async function login() {
    setIsLoading(true)
    try {
      let p = await doLogin(username, password)

      if (remember) {
        await RememberPassword(username, password)
        addAccount(username, password, p) // add only if remember is checked and login is successful
      } else {
        await ForgetPassword()
      }
    } catch (e: any) {
      showError(e)
    }
    setIsLoading(false)
  }

  function showMountPointSelector() {
    EventsEmit('showDirectoryDialog', mountPoint)
  }

  function showError(error: any) {
    if (typeof error === 'string') {
      setErrorMessage(error.toUpperCase())
      if (error === 'USER NOT LOGGED IN') {
        setShowLogin(true)
      }
    } else if (error instanceof Error) {
      setErrorMessage(error.message) // works, `e` narrowed to Error
    }
    setOpenError(true)
  }
  function showInfoMessage(message: any) {
    setInfoMessage(message)
    setOpenInfo(true)
  }

  function copyUrlToClipboard(location: string) {
    try {
      navigator.clipboard.writeText(location).catch((err) => {
        showError(`Unable to copy to the clipboard: ${err}`)
      })
    } catch (err) {
      showError(`Unable to copy to the clipboard (in try/catch): ${err}`)
    }
  }

  return (
    <div id="App">
      <ThemeProvider theme={theme}>
        {/* <h1 style={{ color: 'black' }}>Fairdrive</h1> */}

        {/*shows info*/}
        <Snackbar
          open={openInfo}
          onClose={handleCloseInfo}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseInfo} severity="info" sx={{ width: '100%' }}>
            {infoMessage}
          </Alert>
        </Snackbar>
        {/*shows error*/}
        <Snackbar open={openError} onClose={handleCloseError}>
          <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
            {errorMessage}
          </Alert>
        </Snackbar>

        {/*logo*/}
        {/* <img src={logo} id="logo" alt="logo" className="logo-icon" /> */}

        {/*settings modal*/}
        <Modal
          open={showConfig}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Box
            sx={{
              margin: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: 24,
              bgcolor: 'white',
              p: 4,
            }}
          >
            <FormGroup>
              <Tooltip
                title="Usually bee nodes and gateways are not behind proxy. Please check before connecting via proxy."
                placement="top"
              >
                <FormLabel id="demo-controlled-radio-buttons-group">
                  Is bee node running behind proxy?
                </FormLabel>
              </Tooltip>
              <RadioGroup
                aria-labelledby="demo-controlled-radio-buttons-group"
                name="controlled-radio-buttons-group"
                onChange={updateProxy}
                value={proxyValue}
              >
                <Grid container>
                  <Grid item>
                    <Tooltip title="Select if you directly access Bee">
                      <FormControlLabel
                        value={'no'}
                        control={<Radio />}
                        label="No"
                        style={{ color: 'black' }}
                      />
                    </Tooltip>
                  </Grid>

                  <Grid item>
                    <Tooltip title="Select if your bee is behind proxy (gateways are not proxies)">
                      <FormControlLabel
                        value={'yes'}
                        control={<Radio />}
                        label="Yes"
                        style={{ color: 'black' }}
                      />
                    </Tooltip>
                  </Grid>
                </Grid>
              </RadioGroup>
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <Tooltip title="Bee API endpoint, recommended http://localhost:1635">
                  <TextField
                    margin="normal"
                    value={bee}
                    required
                    fullWidth
                    id="bee"
                    label="Bee"
                    onChange={updateBee}
                    autoComplete="off"
                  />
                </Tooltip>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <Tooltip title="BatchID to use for uploads, leave empty if you are using gateway.">
                  <TextField
                    margin="normal"
                    value={batch}
                    required
                    fullWidth
                    id="batch"
                    label="BatchID"
                    onChange={updateBatch}
                    autoComplete="off"
                  />
                </Tooltip>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <Tooltip title="RPC Endpoint for ENS based authentication">
                  <TextField
                    margin="normal"
                    value={rpc}
                    required
                    fullWidth
                    id="rpc"
                    label="RPC"
                    onChange={updateRPC}
                    autoComplete="off"
                  />
                </Tooltip>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <Tooltip
                  title="Specify Network type for ENS based authentication"
                  placement="top"
                >
                  <Select
                    required
                    fullWidth
                    id="network"
                    label="Network"
                    onChange={updateNetwork}
                    displayEmpty={true}
                    value={network}
                    style={{ color: 'black' }}
                  >
                    <MenuItem value={'testnet'}>Testnet</MenuItem>
                    <MenuItem value={'play'}>FDP play</MenuItem>
                  </Select>
                </Tooltip>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <Tooltip title="Location of the Fairdrive folder, a mounting point">
                  <TextField
                    margin="normal"
                    value={mountPoint}
                    disabled={true}
                    required
                    fullWidth
                    id="mountPoint"
                    label="Mount Location"
                    autoComplete="off"
                  />
                </Tooltip>

                <Tooltip title="Select mounting point location">
                  <IconButton onClick={showMountPointSelector}>
                    <Folder />
                  </IconButton>
                </Tooltip>
              </Box>
              <Stack mt={3} mb={3} spacing={2} direction="row">
                <Tooltip title="Closes this dialog without saving">
                  <Button fullWidth variant="contained" onClick={closeSettings}>
                    Close
                  </Button>
                </Tooltip>
                <Tooltip title="Save settings and connect">
                  <Button
                    fullWidth
                    variant="contained"
                    sx={{ mt: 3, mb: 2 }}
                    onClick={initFairOs}
                    disabled={isLoading}
                  >
                    Start
                  </Button>
                </Tooltip>
              </Stack>
            </FormGroup>
          </Box>
        </Modal>

        <div
          style={{
            position: 'absolute',
            top: '0px',
            zIndex: '10000',
            width: '100%',
            height: '10px',
          }}
        >
          {isLoading && (
            <LinearProgress
              sx={{
                height: 10,
              }}
            />
          )}
        </div>

        {showAccounts && (
          <Dialog open={showAccounts}>
            <Tooltip
              title="Your previously logged accounts. Click on account name to login."
              placement="top"
            >
              <DialogTitle>Accounts</DialogTitle>
            </Tooltip>

            {accounts.length === 0 && (
              <>
                <Typography style={{ color: 'black', margin: '20px' }}>
                  No accounts found
                </Typography>
                <Typography style={{ color: 'gray', margin: '20px' }}>
                  To add account to this list, click on "Remember me" checkbox
                  before login. Accounts do not know about your connection preferences.
                </Typography>
              </>
            )}
            <List>
              {accounts.map((account) => (
                <ListItem key={account.userInfo.username} disabled={isLoading}>
                  <Tooltip title="Switch account" placement="left">
                    <Typography
                      onClick={() => handleAccountSwitch(account)}
                      style={{ cursor: 'pointer' }}
                      className="account-switch"
                    >
                      {account.userInfo.username}&nbsp;
                    </Typography>
                  </Tooltip>

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
              <Button onClick={() => setShowAccounts(false)} disabled={isLoading}>
                Close
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/*about dialog*/}
        {(() => {
          if (showAbout) {
            return (
              <AboutDialog aria-labelledby="about-title" open={showAbout}>
                <DialogTitle>
                  Fairdrive
                  <IconButton
                    aria-label="close"
                    onClick={handleAboutClose}
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
                <DialogContent dividers>
                  <Typography gutterBottom align="center">
                    Powered by&nbsp;
                    <Link href="#" variant="body2" onClick={openBrowserFairOS}>
                      FairOS
                    </Link>
                    &nbsp;
                    <Link href="#" variant="body2" onClick={openBrowserFDPprotocol}>
                      FairDataProtocol
                    </Link>
                  </Typography>

                  <Typography gutterBottom align="center">
                    <Link href="#" variant="body2" onClick={openBrowserLicense}>
                      License
                    </Link>
                    &nbsp;
                    <Link href="#" variant="body2" onClick={openBrowserLicense}>
                      Source
                    </Link>
                  </Typography>

                  <Typography
                    align="center"
                    sx={{ fontWeight: 'light', fontSize: '0.7rem' }}
                  >
                    Version <strong>{version}</strong> Built on{' '}
                    <strong>{buildTime}</strong>
                  </Typography>

                  <img
                    src={logo}
                    id="logo"
                    alt="logo"
                    className="logo-icon"
                    onClick={openBrowserFairDataSociety}
                  />

                  <Typography gutterBottom align="center">
                    ©&nbsp;
                    <Link
                      href="#"
                      variant="body2"
                      onClick={openBrowserFairDataSociety}
                    >
                      FairDataSociety
                    </Link>
                    &nbsp;2022
                  </Typography>

                  <img
                    src={dfLogo}
                    id="logo"
                    alt="logo"
                    className="logo-icon-df"
                    onClick={openBrowserDatafund}
                  />
                  {/* <Typography gutterBottom align="center">
                    <Link href="#" variant="body2" onClick={openBrowserDatafund}>
                      Initiative
                    </Link>
                  </Typography> */}
                </DialogContent>
              </AboutDialog>
            )
          }

          {
            /*pod new dialog*/
          }
          if (showPodNew) {
            return (
              <Dialog open={showPodNew} onClose={handlePodNewClose}>
                <Tooltip title="Imagine POD is one of your drives">
                  <DialogTitle>Create new Pod</DialogTitle>
                </Tooltip>
                <DialogContent>
                  <TextField
                    autoFocus
                    margin="dense"
                    id="podName"
                    label="Pod Name"
                    fullWidth
                    variant="standard"
                    onChange={updateNewPodName}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={handlePodNewClose} disabled={isLoading}>
                    Close
                  </Button>
                  <Button onClick={handlePodNew} disabled={isLoading}>
                    Create
                  </Button>
                </DialogActions>
              </Dialog>
            )
          }

          if (showLogin) {
            return (
              <>
                <img
                  src={logo}
                  id="logo"
                  alt="logo"
                  className="logo-icon"
                  onClick={() => setShowAccounts(true)}
                />
                <Container component="main" maxWidth="xs">
                  <Box
                    sx={{
                      marginTop: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <FormGroup>
                      <h2 style={{ color: 'black' }}>Fair Data Society Login</h2>
                      <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="username"
                        label="Username"
                        onChange={updateName}
                        autoComplete="off"
                        autoFocus
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
                        style={{ color: 'black' }}
                      />
                      <Button
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        onClick={login}
                        disabled={isLoading}
                      >
                        Login
                      </Button>
                      <>
                        <br />
                        <Typography style={{ color: 'black' }}>
                          Don't have an account?
                        </Typography>
                        <Link
                          href="#"
                          variant="body2"
                          onClick={openSignUp}
                          align="center"
                        >
                          Sign Up
                        </Link>
                      </>
                    </FormGroup>
                  </Box>
                </Container>
              </>
            )
          }

          if (showPods) {
            if (pods != null && pods.length != 0) {
              return (
                <Container component="main" maxWidth="xs">
                  <Tooltip title="Existing pods are listed here. You can mount and unmount them, and they will auto-magically appear in your filesystem at mount point.">
                    <h2 style={{ color: 'black', marginBottom: '0px' }}>Pods</h2>
                  </Tooltip>
                  <Tooltip title="Current account name">
                    <Typography
                        style={{ color: 'gray' }}
                        onClick={() => setShowAccounts(true)}
                    >
                      {username}
                    </Typography>
                  </Tooltip>

                  <Box
                      sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}
                  >
                    <List>
                      {pods.map((pod) =>
                        pod.isMounted ? (
                          <ListItem
                            key={pod.podName}
                            secondaryAction={
                              <div>
                                <Tooltip title={pod.mountPoint}>
                                  <IconButton
                                      onClick={() => copyUrlToClipboard(pod.mountPoint)}
                                  >
                                    <ContentCopyIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Open">
                                  <IconButton
                                      onClick={() => EventsEmit('open', pod.mountPoint)}
                                  >
                                    <Folder />
                                  </IconButton>
                                </Tooltip>
                              </div>
                            }
                            disablePadding
                          >
                            <ListItemButton>
                              <ListItemIcon>
                                <Tooltip
                                    title={
                                      pod.isMounted
                                          ? 'Unmount this pod'
                                          : 'Mount this pod'
                                    }
                                >
                                  <Checkbox
                                      onChange={mount}
                                      value={pod.podName}
                                      color="primary"
                                      disabled={isLoading}
                                      checked={pod.isMounted}
                                  />
                                </Tooltip>
                              </ListItemIcon>
                              <ListItemText
                                  primary={pod.podName}
                                  style={{ color: 'black' }}
                              />
                            </ListItemButton>
                          </ListItem>
                        ) : (
                          <ListItem key={pod.podName} disablePadding>
                            <ListItemButton>
                              <ListItemIcon>
                                <Tooltip
                                    title={
                                      pod.isMounted
                                          ? 'Unmount this pod'
                                          : 'Mount this pod'
                                    }
                                >
                                  <Checkbox
                                      onChange={mount}
                                      value={pod.podName}
                                      color="primary"
                                      disabled={isLoading}
                                      checked={pod.isMounted}
                                  />
                                </Tooltip>
                              </ListItemIcon>
                              <ListItemText
                                  primary={pod.podName}
                                  style={{ color: 'black' }}
                              />
                            </ListItemButton>
                          </ListItem>
                        ),
                      )}
                    </List>
                  </Box>
                </Container>
              )
            } else {
              return (
                <Container component="main" maxWidth="xs">
                  <Tooltip title="Existing pods are listed here. You can mount and unmount them, and they will auto-magically appear in your filesystem at mount point.">
                    <h2 style={{ color: 'black', marginBottom: '0px' }}>Pods</h2>
                  </Tooltip>
                  <Tooltip title="Current account name">
                    <Typography
                        style={{ color: 'gray' }}
                        onClick={() => setShowAccounts(true)}
                    >
                      {username}
                    </Typography>
                  </Tooltip>

                  <Box
                    sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}
                  >
                    <br/>
                    <Typography gutterBottom align="center" style={{ color: 'black' }}>
                      Still do not have pods?
                    </Typography>

                    <Button
                      fullWidth
                      variant="contained"
                      sx={{ mt: 3, mb: 2 }}
                      onClick={() => setPodNew(true)}
                      disabled={isLoading}
                    >
                      Create Pod
                    </Button>
                  </Box>
                </Container>
              )
            }
          }
        })()}

        <img
          src={backgroundImage}
          id="background"
          alt="background"
          style={{
            opacity: '0.1',
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
      </ThemeProvider>
    </div>
  )
}

export default App
