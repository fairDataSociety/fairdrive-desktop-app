import React, { forwardRef, SyntheticEvent, useEffect, useState } from 'react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
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
  Modal,
  Tooltip,
  IconButton,
  Stack,
  Snackbar,
  AlertProps,
  Dialog,
  Typography,
  DialogActions,
  List,
  ListItem,
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

interface UserInfo {
  username: string | any
  password: string | any
  mnemonic: string | any
}

interface AccountInfo {
  userInfo: UserInfo[] | any
  pods: PodMountedInfo[] | any
}

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

  async function openCreateLightAccount() {}

  async function handleAccountSwitch(account: AccountInfo) {
    setIsLoading(true)
    try {
      setShowLogin(false)
      setShowPods(false)
      setName(account.userInfo.username)
      setPassword(account.userInfo.password)
      setMnemonic(account.userInfo.mnemonic)
      doLogin(
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
    removeAccount(account)
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
        <Modal
          open={showConfig}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Box
            sx={{
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: 24,
              bgcolor: 'white',
              p: 2,
            }}
          >
            {/* Preferences switch */}
            <div style={{ marginTop: '-5px' }}>
              <div
                style={{ color: 'black', fontWeight: 'bolder', marginBottom: '5px' }}
              >
                Preferences
              </div>
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
          </Box>
        </Modal>

        {/* Account Import */}
        <Modal
          open={showAccountImport}
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
              p: 2,
            }}
          >
            <div
              style={{
                marginTop: '-5px',
                color: 'black',
                fontWeight: 'bolder',
                marginBottom: '15px',
              }}
            >
              Import Account
            </div>
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
                    onClick={() => setShowAccountImport(false)}
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
          </Box>
        </Modal>

        {/* Account details*/}
        <Modal
          open={showAccountDetails}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Box
            sx={{
              margin: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: 24,
              bgcolor: 'white',
              p: 2,
            }}
          >
            <div
              style={{
                marginTop: '-5px',
                color: 'black',
                fontWeight: 'bolder',
                marginBottom: '15px',
              }}
            >
              Account Details
            </div>
            {username === '' ? (
              <Tooltip title="Seems like there is no account information">
                <Typography style={{ color: 'black' }}>No account info</Typography>
              </Tooltip>
            ) : (
              <>
                <Typography style={{ color: 'black' }}>
                  <strong>{username}</strong>
                </Typography>
                <Typography style={{ color: 'black' }}>Password</Typography>
                <span style={{ color: 'transparent', textShadow: '0 0 15px #000' }}>
                  <strong>{password}</strong>
                </span>
                <br />
                {mnemonic != '' ? (
                  <>
                    <Typography style={{ color: 'black' }}>
                      This is Lite account
                    </Typography>
                    <br />
                    <Typography style={{ color: 'black' }}>Mnemonic</Typography>
                    <span
                      style={{ color: 'transparent', textShadow: '0 0 15px #000' }}
                    >
                      <strong>{mnemonic}</strong>
                    </span>

                    <Typography style={{ color: 'black' }}>Private Key</Typography>
                    <span
                      style={{ color: 'transparent', textShadow: '0 0 15px #000' }}
                    >
                      <strong style={{ fontSize: '8px' }}>{privateKey}</strong>
                    </span>
                  </>
                ) : (
                  <Typography style={{ color: 'black' }}>
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
                    variant="contained"
                    onClick={() => setShowAccountDetails(false)}
                  >
                    Close
                  </Button>
                </Tooltip>
              </Stack>
            </FormGroup>
          </Box>
        </Modal>

        {isLoading && (
          <Backdrop
            sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1000000000 }}
            open={isLoading}
          >
            <CircularProgress color="inherit" />
          </Backdrop>
        )}

        {showAccounts && (
          <Box>
            <Dialog open={showAccounts}>
              <Tooltip
                title="Your previously logged accounts. Click on account name to login."
                placement="top"
              >
                <div
                  style={{
                    color: 'black',
                    fontWeight: 'bolder',
                    margin: '5px',
                  }}
                >
                  Accounts
                </div>
              </Tooltip>

              {accounts.length === 0 && (
                <>
                  <Typography style={{ color: 'black', margin: '20px' }}>
                    No accounts found
                  </Typography>
                  <Typography style={{ color: 'gray', margin: '20px' }}>
                    To add account to this list, click on "Remember me" checkbox
                    before login. Accounts do not know about your connection
                    preferences. Lite accounts are added automatically.
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
                  onClick={() => setShowAccounts(false)}
                  disabled={isLoading}
                  variant="contained"
                  style={{
                    width: '100%',
                  }}
                >
                  Close
                </Button>
              </DialogActions>
            </Dialog>
            {/* <Slide
              direction="up"
              in={showAccounts}
              mountOnEnter
              unmountOnExit
            ></Slide> */}
          </Box>
        )}

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
