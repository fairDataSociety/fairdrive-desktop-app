import { forwardRef, SyntheticEvent, useEffect, useState } from 'react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import logo from './assets/images/fairdata.svg'
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
  GetCashedPods
} from "../wailsjs/go/handler/Handler"
import { SetupConfig, IsSet, GetConfig, GetMountPoint, GetAutoMount, GetMountedPods } from "../wailsjs/go/main/conf"
import { RememberPassword, HasRemembered, ForgetPassword, Get } from "../wailsjs/go/main/Account"

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
} from '@mui/material'
import MuiAlert from '@mui/material/Alert'
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { api, handler } from '../wailsjs/go/models'
import { EventsEmit, EventsOn } from '../wailsjs/runtime'
import { Folder } from '@mui/icons-material'
import CloseIcon from '@mui/icons-material/Close'
import { BuildTime, Version } from '../wailsjs/go/main/about'
import PodMountedInfo = handler.PodMountedInfo;

const theme = createTheme({
  typography: {
    "fontFamily": `"WorkSans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
    "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
    sans-serif`
  }
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
  const [open, setOpen] = useState(false)
  const handleClose = (event?: SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return
    }

    setOpen(false)
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
  }

  const [version, setVersion] = useState('')
  const [buildTime, setTime] = useState('')

  const [showConfig, setShowConfig] = useState<boolean>(false)
  const [showLogin, setShowLogin] = useState<boolean>(true)
  const [showPods, setShowPods] = useState<boolean>(true)

  const [username, setName] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState<boolean>(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    EventsOn('preferences', () => {
      setShowConfig(true)
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
            setName(acc.Username)
            setPassword(acc.Password)

            await Login(acc.Username, acc.Password)
            let p = await GetPodsList()

            setPods(p)
            setShowLogin(false)

            let _mountPoint = await GetMountPoint()
            setMountPoint(_mountPoint)

            let autoMount = await GetAutoMount()
            if(autoMount) {
              let mountedPods = await GetMountedPods()
              mountedPods.map(async (pod) => {
                await Mount(pod, _mountPoint, false)
                let pods = await GetCashedPods()
                setPods(pods)
              })
            }
          }
        } catch (e: any) {
          EventsEmit('disableMenus')
          showError(e)
        }
        setIsLoading(false)
      }
    })
    HasRemembered().then((isSet) => {
      if (!isSet) {
        setRemember(true)
      }
    })
  }, [])
  const [pods, setPods] = useState<PodMountedInfo[]>([])
  const updateName = (e: any) => setName(e.target.value)
  const updatePassword = (e: any) => setPassword(e.target.value)
  const updateRemember = (e: any) => setRemember(e.target.checked)

  const mount = async (e: any) => {
    setIsLoading(true)
    if (e.target.checked) {
      // TODO need to check how mount point can be passed for Windows and linux
      try {
        await Mount(e.target.value, mountPoint, false)
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
  const [isProxy, setProxy] = useState<boolean>(true)
  const [proxyValue, setProxyValue] = useState('yes')
  const [bee, setBee] = useState('https://bee-1.dev.fairdatasociety.org')
  const [batch, setBatch] = useState('')
  const [rpc, setRPC] = useState('https://xdai.dev.fairdatasociety.org')
  const [network, setNetwork] = useState('testnet')
  const updateProxy = (e: any) => {
    setProxyValue(e.target.value)
    if (e.target.value === 'no') {
      setProxy(false)
    } else {
      setProxy(true)
    }
  }

  const updateBee = (e: any) => setBee(e.target.value)
  const updateBatch = (e: any) => setBatch(e.target.value)
  const updateRPC = (e: any) => setRPC(e.target.value)
  const updateNetwork = (e: any) => setNetwork(e.target.value)
  const updateNewPodName = (e: any) => setNewPodName(e.target.value)

  async function closeSettings() {
    setShowConfig(false)
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
      await Start(cfg)
      setShowConfig(false)
    } catch (e: any) {
      showError(e)
    }
    setIsLoading(false)
  }

  async function login() {
    setIsLoading(true)
    try {
      await Login(username, password)
      let p = await GetPodsList()
      setShowLogin(false)
      setPods(p)
      setShowPods(true)
      if (remember) {
        await RememberPassword(username, password)
      } else {
        await ForgetPassword()
      }
      EventsEmit('enableMenus')
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
      setMessage(error.toUpperCase())
      if (message === 'USER NOT LOGGED IN') {
        setShowLogin(true)
      }
    } else if (error instanceof Error) {
      setMessage(error.message) // works, `e` narrowed to Error
    }
    setOpen(true)
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

        {/*shows error*/}
        <Snackbar open={open} onClose={handleClose}>
          <Alert onClose={handleClose} severity="error" sx={{ width: '100%' }}>
            {message}
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
              marginTop: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: 24,
              bgcolor: 'white',
              p: 4,
            }}
          >
            <FormGroup>
              <FormLabel id="demo-controlled-radio-buttons-group">
                Is bee node running behind proxy?
              </FormLabel>
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
                    <Tooltip title="Select if your bee is behind proxy">
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
                <Tooltip title="Bee API endpoint, recomended http://localhost:1635">
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
                <Tooltip title="Specify Network type for ENS based authentication">
                  <Select
                    required
                    fullWidth
                    id="network"
                    label="Network"
                    onChange={updateNetwork}
                    displayEmpty={true}
                    value={network}
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
                  <Typography gutterBottom align="left">
                    Version {version}
                  </Typography>
                  <Typography gutterBottom align="left">
                    Built on {buildTime}
                  </Typography>
                  <Typography gutterBottom align="left">
                    <Link href="#" variant="body2">
                      License
                    </Link>
                  </Typography>
                  <Typography gutterBottom align="left">
                    <Link href="#" variant="body2">
                      Powered by FairOS
                    </Link>
                  </Typography>
                  <br />
                  <Typography gutterBottom align="left">
                    © FairDataSociety 2022
                  </Typography>
                  <img src={logo} id="logo" alt="logo" className="logo-icon" />
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
                <img src={logo} id="logo" alt="logo" className="logo-icon" />
                <Container component="main" maxWidth="xs">
                  <Box
                    sx={{
                      marginTop: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <FormGroup>
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
                          <Typography>Remember and keep me logged-in</Typography>
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
                      <Grid container>
                        <Grid item>
                          {/*TODO add create account website and fairdrive */}
                          <Link href="#" variant="body2">
                            {"Don't have an account? Sign Up"}
                          </Link>
                        </Grid>
                      </Grid>
                    </FormGroup>
                  </Box>
                </Container>
              </>
            )
          }

          if (showPods && pods != null) {
            return (
              <Container component="main" maxWidth="xs">
                <Tooltip title="Existing pods are listed here. You can mount and unmount them, and they will auto-magically appear in your filesystem at mount point.">
                  <h2 style={{ color: 'black' }}>Pods</h2>
                </Tooltip>
                <FormGroup>
                  {pods.map((pod) => (
                    <Grid container key={pod.podName}>
                      <Grid item>
                        <Tooltip
                          title={
                            pod.isMounted ? 'Unmount this pod' : 'Mount this pod'
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
                        &nbsp;
                        <FormControlLabel
                          control={
                            pod.isMounted ? (
                              <Tooltip title={pod.mountPoint}>
                                <IconButton
                                  onClick={() => copyUrlToClipboard(pod.mountPoint)}
                                >
                                  <ContentCopyIcon />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <></>
                            )
                          }
                          label={pod.podName}
                          style={{ color: 'black' }}
                        />
                      </Grid>
                    </Grid>
                  ))}
                </FormGroup>
              </Container>
            )
          }
        })()}

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
      </ThemeProvider>
    </div>
  )
}

export default App
