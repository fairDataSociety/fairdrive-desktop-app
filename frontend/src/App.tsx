import React, { forwardRef, SyntheticEvent, useEffect, useState } from 'react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { DialogContent, DialogTitle, useMediaQuery } from '@mui/material';
import './App.css'

import {
  Login,
  Mount,
  GetPodsList,
  Unmount,
  Start,
  Close,
  Logout,
  GetCashedPods,
  Load,
  Sync,
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
  FormGroup,
  FormLabel,
  MenuItem,
  Select,
  Box,
  Tooltip,
  IconButton,
  Stack,
  Snackbar,
  AlertProps,
  Dialog,
  Switch,
  CircularProgress, Backdrop,
} from '@mui/material'
import MuiAlert from '@mui/material/Alert'
import { api, handler } from '../wailsjs/go/models'
import { EventsEmit, EventsOn } from '../wailsjs/runtime'
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PodMountedInfo = handler.PodMountedInfo
import AboutComponent from "./components/about";
import NewPodComponent from "./components/newPod";
import { ErrorSnack } from "./components/error";
import ReceivePodComponent from "./components/receivePod";
import ReceiveForkPodComponent from "./components/receiveForkPod";
import LoginComponent from "./components/login";
import PodsComponent from "./components/pods";
import EmptyPodsComponent from "./components/empty";
import CloseIcon from "@mui/icons-material/Close";
import { darkPalette } from "./utils/theme";
import ImportAccountComponent from "./components/importAccount";
import AccountDetailsComponent from "./components/accountDetails";
import { AccountInfo, UserInfo } from "./types/info";
import ShowAccountsComponent from "./components/showAccounts";

function createUserInfo(
  username: string,
  password: string,
  mnemonic: string,
): UserInfo {
  return { username, password, mnemonic }
}

// function addAccount(userInfo: UserInfo, pods: PodMountedInfo[]): AccountInfo {
//   return { userInfo, pods }
// }

function createAccountInfo(
  username: string,
  password: string,
  mnemonic: string,
  pods: PodMountedInfo[],
): AccountInfo {
  return { userInfo: createUserInfo(username, password, mnemonic), pods }
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
})

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = createTheme({
    palette: darkPalette,
    typography: {
      fontFamily: `"WorkSans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
    "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
    sans-serif`,
    },
  })

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

  async function loadPodsAndResetAll() {
    let p = await GetPodsList()
    setPods(p)
  }

  const [showPodNew, setShowPodNew] = useState<boolean>(false)
  const handlePodNewClose = () => {
    setShowPodNew(false)
  }

  const [showPodReceive, setShowPodReceive] = useState<boolean>(false)
  const handlePodReceiveClose = () => {
    setShowPodReceive(false)
  }

  const [showPodReceiveFork, setShowPodReceiveFork] = useState<boolean>(false)
  const handlePodReceiveForkClose = () => {
    setShowPodReceiveFork(false)
  }


  const [showConfig, setShowConfig] = useState<boolean>(false)
  const [showAccountDetails, setShowAccountDetails] = useState<boolean>(false)
  const [showAccountImport, setShowAccountImport] = useState<boolean>(false)

  const [showLogin, setShowLogin] = useState<boolean>(true)
  const [showPods, setShowPods] = useState<boolean>(true)

  const [showAccounts, setShowAccounts] = useState<boolean>(false)

  const [username, setName] = useState('')
  const [password, setPassword] = useState('')
  const [mnemonic, setMnemonic] = useState('')
  const [privateKey, setPrivateKey] = useState('')

  const [importUsername, setImportName] = useState('')
  const [importPassword, setImportPassword] = useState('')
  const [importMnemonic, setImportMnemonic] = useState('')

  const [remember, setRemember] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState('') // error message
  const [infoMessage, setInfoMessage] = useState('') // info messages

  async function LoadStoredAccounts() {
    let storedAccounts = localStorage.getItem('accounts')
    if (storedAccounts !== null) {
      let acs = JSON.parse(storedAccounts)
      accounts = acs // this is BAD hack
      setAccounts(acs)
      //console.log('accounts', acs)
    }
  }

  useEffect(() => {
    const html = document.querySelector('html');
    const body = document.querySelector('body');
    if (html && body) {
      console.log(JSON.stringify(theme.palette))

      html.style.setProperty('--background-color', theme.palette.background.default);
      body.style.setProperty('--background-color', theme.palette.background.default);

      html.style.setProperty('--color', theme.palette.text.primary);
      body.style.setProperty('--color', theme.palette.text.primary);
    }
    LoadStoredAccounts()
    EventsOn('preferences', () => {
      setShowConfig(true)
    })
    EventsOn('accountImport', () => {
      setImportName('')
      setImportPassword('')
      setImportMnemonic('')
      setShowAccountImport(true)
    })
    EventsOn('accountDetails', () => {
      setShowAccountDetails(true)
    })
    EventsOn('showAccounts', () => {
      setShowAccounts(true)
    })
    EventsOn('podNew', () => {
      console.log(theme)
      setShowPodNew(true)
    })
    EventsOn('podReceive', () => {
      setShowPodReceive(true)
    })
    EventsOn('podReceiveFork', () => {
      setShowPodReceiveFork(true)
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
        setMnemonic('') // need to clean mnemonic
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

    IsSet().then(async (isSet) => {
      if (!isSet) {
        setShowConfig(true)
      } else {
        let c = await GetConfig()
        if (c !== null) {
          setBee(c.bee)
          setBatch(c.batch)
          setNetwork(c.network)
          setRPC(c.rpc)
        }
        setIsLoading(true)
        try {
          await Start(c) // TODO: remember me will not work for lite accounts

          let acc = await Get()
          if (acc.Username === '' || acc.Password === '') {
            EventsEmit('disableMenus')
          } else {
            //console.log('doLogin remember', acc.Username, acc.Password)

            await doLogin(acc.Username, acc.Password, '') // TODO remember me will not work for Lite Accounts as there is no mnemonic info available

            let _mountPoint = await GetMountPoint()
            setMountPoint(_mountPoint)

            let autoMount = await GetAutoMount()
            if (autoMount) {
              let mountedPods = await GetMountedPods()
              if (mountedPods != null) {
                mountedPods.map(async (pod) => {
                  await Mount(pod, _mountPoint, batch === '')
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

  const updateImportName = (e: any) => setImportName(e.target.value)
  const updateImportPassword = (e: any) => setImportPassword(e.target.value)
  const updateImportMnemonic = (e: any) => setImportMnemonic(e.target.value)
  let [accounts, setAccounts] = useState<AccountInfo[]>([])

  const addAccount = async (
    username: string,
    password: string,
    mnemonic: string,
    pods: handler.PodMountedInfo[],
  ) => {
    const account = accounts.find((obj) => {
      return obj.userInfo.username === username
    })

    if (account === undefined) {
      let newAccountInfo = createAccountInfo(username, password, mnemonic, pods)
      let newAccounts = [...accounts, newAccountInfo]
      setAccounts(newAccounts)
      localStorage.setItem('accounts', JSON.stringify(newAccounts))
      showInfoMessage('Account added to account list')
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

  const sync = async (podName: string) => {
    try {
      setIsLoading(true)
      await Sync(podName)
    } catch (e) {
      showError(e)
    }
    setIsLoading(false)
  }

  const mount = async (e: any) => {
    setIsLoading(true)
    let podName = e.target.value
    if (e.target.checked) {
      try {
        let readOnly = false
        pods.map(pod => {
          if (pod.podName === podName) {
            readOnly = pod.isShared
          }
        })
        if (batch === '') {
          readOnly = true
        }
        console.log(readOnly)
        await Mount(podName, mountPoint, readOnly)
        EventsEmit('Mount')
      } catch (e: any) {
        showError(e)
        setIsLoading(false)
        return
      }
    } else {
      try {
        await Unmount(podName)
        EventsEmit('Mount')
      } catch (e: any) {
        showError(e)
        setIsLoading(false)
        return
      }
    }
    let cachedPods = await GetCashedPods()
    setPods(cachedPods)
    setIsLoading(false)
  }
  const [mountPoint, setMountPoint] = useState('')

  const [toggleConfigAdvanced, setToggleConfigAdvanced] = useState<boolean>(false)
  const [switchLocalGateway, setSwitchLocalGateway] = useState<boolean>(false)

  const [bee, setBee] = useState('http://localhost:1633') // should be localhost as default, as per swarm web3 PC, previously https://bee-1.dev.fairdatasociety.org // TODO check in go code
  const [batch, setBatch] = useState('')
  const [rpc, setRPC] = useState('https://xdai.dev.fairdatasociety.org')
  const [network, setNetwork] = useState('testnet')
  const [preferencesUpdated, setPreferencesUpdated] = useState(false)

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
      bee: bee,
      batch: batch,
      rpc: rpc,
      network: network,
    }
    try {
      await SetupConfig(bee, batch, network, rpc, mountPoint)
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

  async function handleAccountSwitch(account: AccountInfo) {
    setIsLoading(true)
    try {
      setShowLogin(false)
      setShowPods(false)
      setName(account.userInfo.username)
      setPassword(account.userInfo.password)
      setMnemonic(account.userInfo.mnemonic)
      await doLogin(
        account.userInfo.username,
        account.userInfo.password,
        account.userInfo.mnemonic,
      )
      setShowAccounts(false)
    } catch (e: any) {
      showError(e)
      setShowLogin(true)
    }
    setIsLoading(false)
  }
  async function handleAccountRemove(account: AccountInfo) {
    setIsLoading(true)
    await removeAccount(account)
    setInfoMessage('Account removed.')
    setIsLoading(false)
  }

  /* Import account */
  async function importAccount() {
    let mnemonicCount = importMnemonic.split(' ').length
    if (importUsername.length < 3) {
      showError('Username should be lengthier')
      return
    }
    if (importPassword.length < 3) {
      showError('Oh, come on, password should be longer')
      return
    }
    if (mnemonicCount < 12) {
      showError('Mnemonic word count should be 12')
      return
    }
    try {
      await doLogin(importUsername, importPassword, importMnemonic)
    } catch (e: any) {
      showError(e)
    }
  }

  async function doLogin(user: string, pass: string, mnem: string) {
    // TODO: logout existing user and maybe unmount all pods
    try {
      await Logout()
    } catch (e: any) {
      console.log(e)
    }
    /*
    TODO change logic for load user
    */
    let isPortableAccount = mnem === '' || mnem === undefined
    if (isPortableAccount) {
      mnem = '' // TODO fix should not be undefined, causes error and user can not be logged out
      try {
        // try to log in with Portable account, if it fails, login with portable
        await Login(user, pass)
        let p = await GetPodsList()
        setPrivateKey('')
        setMnemonic('')
        setShowLogin(false)
        setPods(p)
        console.log(p)
        setShowPods(true)
        EventsEmit('enableMenus')
        setOpenError(false) // close error if it was open before
        return { p, m: new handler.LiteUser() }
      } catch (e) {
        if (e==="invalid password") {
          throw e
        }
      }
    }

    const existingAccount = accounts.find((obj) => {
      return obj.userInfo.username === user
    })

    // if mnemonic is present then it could be stored lite account
    if (
      existingAccount !== undefined &&
      existingAccount.userInfo.mnemonic !== undefined &&
      existingAccount.userInfo.mnemonic !== ''
    ) {
      mnem = existingAccount.userInfo.mnemonic
    }

    try {
      let m = await Load(user, pass, mnem)
      showInfoMessage('Logging into Lite account')
      mnem = m.mnemonic
      setMnemonic(m.mnemonic)
      setPrivateKey(m.privateKey)

      let p = await GetPodsList()
      setShowLogin(false)
      setPods(p)
      setShowPods(true)
      EventsEmit('enableMenus')
      showInfoMessage('Lite account logged in. See Details for account info.')
      addAccount(user, pass, mnem, pods)
      setOpenError(false) // close error if it was open before
      setShowAccountImport(false)

      return { p, m }
    } catch (e) {
      throw e
    }
  }

  async function login() {
    setIsLoading(true)
    try {
      console.log('login', username, password, mnemonic)
      let { p, m } = await doLogin(username, password, mnemonic)

      console.log('got login', p, m)
      if (remember) {
        await RememberPassword(username, password)
        addAccount(username, password, m.mnemonic, p) // add only if remember is checked and login is successful
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
    setOpenError(true)
    setErrorMessage(error.toUpperCase())
  }

  function showInfoMessage(message: any) {
    setInfoMessage(message)
    setOpenInfo(true)
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
          autoHideDuration={5000}
        >
          <Alert onClose={handleCloseInfo} severity="info" sx={{ width: '100%' }}>
            {infoMessage}
          </Alert>
        </Snackbar>
        {/*shows error*/}
        <ErrorSnack errorMessage={errorMessage} open={openError} show={setOpenError}/>

        {/*logo*/}
        {/* <img src={logo} id="logo" alt="logo" className="logo-icon" /> */}

        {/*settings modal*/}
        <Dialog
          open={showConfig}
          aria-labelledby="settings"
        >
          <DialogTitle>
            Preferences
            <IconButton
              aria-label="close"
              onClick={closeSettings}
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
            {/* Preferences switch */}
            <div style={{ marginTop: '-5px' }}>
              <span
                style={{
                  color: toggleConfigAdvanced ? 'gray' : 'black',
                  fontWeight: toggleConfigAdvanced ? 'normal' : 'bold',
                }}
              >
                Simple
              </span>
              <Switch
                checked={toggleConfigAdvanced}
                onChange={() => setToggleConfigAdvanced(!toggleConfigAdvanced)}
              />
              <span
                style={{
                  color: toggleConfigAdvanced ? 'black' : 'gray',
                  fontWeight: toggleConfigAdvanced ? 'bold' : 'normal',
                }}
              >
                Advanced
              </span>
            </div>

            {/* Advanced configuration */}
            {toggleConfigAdvanced === true && (
              <FormGroup>
                <Tooltip
                  title="Usually bee nodes and gateways are not behind proxy. Please check before connecting via proxy."
                  placement="bottom"
                >
                  <FormLabel id="demo-controlled-radio-buttons-group">
                    Is Bee running behind proxy?
                  </FormLabel>
                </Tooltip>
                <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Tooltip title="Bee API endpoint, recommended http://localhost:1633">
                    <TextField
                      margin="normal"
                      value={bee}
                      required
                      fullWidth
                      id="bee"
                      label="Bee API URL"
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
                      label="Bee Postage Stamp Batch ID"
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
                      label="RPC endpoint for selected network"
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
                      <OpenInNewIcon />
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
            )}
            {/* Simple configuration */}
            {toggleConfigAdvanced === false && (
              <FormGroup>
                <Tooltip
                  title="Toggle between bee location or gateway bee."
                  placement="bottom"
                >
                  <>
                    <span style={{ color: 'black', marginTop: '8px' }}>
                      Bee location
                    </span>
                    <div>
                      <span
                        style={{
                          color: switchLocalGateway ? 'gray' : 'black',
                          fontWeight: switchLocalGateway ? 'normal' : 'bold',
                        }}
                      >
                        localhost
                      </span>
                      <Switch
                        checked={switchLocalGateway}
                        onChange={() => {
                          updateBee({
                            target: {
                              value: switchLocalGateway
                                ? 'http://localhost:1633'
                                : 'https://bee-1.fairdatasociety.org',
                            },
                          })
                          updateRPC({
                            target: {
                              value: switchLocalGateway
                                ? 'https://xdai.dev.fairdatasociety.org' // NOT SURE WHAT TO PUT HERE
                                : 'https://xdai.dev.fairdatasociety.org',
                            },
                          })
                          updateBatch({
                            target: {
                              value: switchLocalGateway ? batch : '',
                            },
                          })
                          setSwitchLocalGateway(!switchLocalGateway)
                        }}
                      />
                      <span
                        style={{
                          color: switchLocalGateway ? 'black' : 'gray',
                          fontWeight: switchLocalGateway ? 'bold' : 'normal',
                        }}
                      >
                        gateway
                      </span>
                    </div>
                  </>
                </Tooltip>

                <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Tooltip title="Bee API endpoint, recommended http://localhost:1633">
                    <TextField
                      margin="normal"
                      value={bee}
                      required
                      fullWidth
                      id="bee"
                      label="Bee API URL"
                      onChange={updateBee}
                      autoComplete="off"
                    />
                  </Tooltip>
                </Box>
                <Box
                  sx={{ display: 'flex', alignItems: 'flex-end' }}
                  className={switchLocalGateway ? 'shrinkable' : ''}
                >
                  <Tooltip title="BatchID to use for uploads, leave empty if you are using gateway.">
                    <TextField
                      margin="normal"
                      value={batch}
                      required
                      fullWidth
                      id="batch"
                      label="Bee Postage Stamp Batch ID"
                      onChange={updateBatch}
                      autoComplete="off"
                      disabled={switchLocalGateway}
                    />
                  </Tooltip>
                </Box>

                <Box
                  sx={{ display: 'flex', alignItems: 'flex-end' }}
                  className={!toggleConfigAdvanced ? 'shrinkable' : ''}
                >
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
                      disabled={!toggleConfigAdvanced}
                    />
                  </Tooltip>
                </Box>
                <Box
                  sx={{ display: 'flex', alignItems: 'flex-end' }}
                  className={!toggleConfigAdvanced ? 'shrinkable' : ''}
                >
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
                      disabled={!toggleConfigAdvanced}
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
                      <OpenInNewIcon />
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
            )}
          </DialogContent>
        </Dialog>

        {/* Account Import */}
        <ImportAccountComponent
          isOpen={showAccountImport}
          onClose={() => setShowAccountImport(false)}
          updateImportName={updateImportName}
          updateImportPassword={updateImportPassword}
          updateImportMnemonic={updateImportMnemonic}
          importAccount={importAccount} />

        {/* Account details*/}
        <AccountDetailsComponent
          isOpen={showAccountDetails}
          onClose={() => setShowAccountDetails(false)}
          username={username}
          password={password}
          mnemonic={mnemonic}
          privateKey={privateKey} />

        {isLoading && (
          <Backdrop
            sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1000000000 }}
            open={isLoading}
          >
            <CircularProgress color="inherit" />
          </Backdrop>
        )}

        <ShowAccountsComponent
          isOpen={showAccounts}
          isLoading={isLoading}
          onClose={() => setShowAccounts(false)}
          accounts={accounts}
          handleAccountSwitch={handleAccountSwitch}
          handleAccountRemove={handleAccountRemove} />

        {(() => {
          if (showAbout) {
            return (
              <AboutComponent  isOpen={showAbout} onClose={handleAboutClose}/>
            )
          }

          if (showPodNew) {
            return (
              <NewPodComponent
                isOpen={showPodNew}
                isLoading={isLoading}
                onClose={handlePodNewClose}
                showLoader={setIsLoading}
                onError={showError}
                onSuccess={loadPodsAndResetAll}/>
            )
          }

          if (showPodReceive) {
            return (
              <ReceivePodComponent
                isOpen={showPodReceive}
                isLoading={isLoading}
                onClose={handlePodReceiveClose}
                showLoader={setIsLoading}
                onError={showError}
                onSuccess={loadPodsAndResetAll}/>
            )
          }

          if (showPodReceiveFork) {
            return (
              <ReceiveForkPodComponent
                isOpen={showPodReceiveFork}
                isLoading={isLoading}
                onClose={handlePodReceiveForkClose}
                showLoader={setIsLoading}
                onError={showError}
                onSuccess={loadPodsAndResetAll}/>
            )
          }

          if (showLogin) {
            return (
              <LoginComponent
                login={login}
                isLoading={isLoading}
                updateUsername={updateName}
                updatePassword={updatePassword}
                updateRemember={updateRemember}/>
            )
          }

          if (showPods) {
            if (pods != null && pods.length != 0) {
              return (
                <PodsComponent
                  isLoading={isLoading}
                  pods={pods}
                  username={username}
                  mnemonic={mnemonic}
                  onError={showError}
                  setShowAccounts={setShowAccounts}
                  showLoader={setIsLoading}
                  onSuccess={loadPodsAndResetAll}
                  mount={mount}/>
              )
            } else {
              return (
                <EmptyPodsComponent
                  isLoading={isLoading}
                  username={username}
                  mnemonic={mnemonic}
                  setShowAccounts={setShowAccounts}/>
              )
            }
          }
        })()}
      </ThemeProvider>
    </div>
  )
}

export default App
