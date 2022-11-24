import {forwardRef, SyntheticEvent, useEffect, useState} from 'react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import logo from './assets/images/logo-universal.png'
import './App.css'
import {Login, Mount, GetPodsList, Unmount, Start, Close} from "../wailsjs/go/handler/Handler"
import {SetupConfig, IsSet, GetConfig} from "../wailsjs/go/main/conf"
import {RememberPassword, HasRemembered, ForgetPassword, Get} from "../wailsjs/go/main/Account"

import {
    TextField,
    Button,
    Checkbox,
    FormGroup,
    FormControlLabel,
    FormLabel,
    RadioGroup,
    Radio, MenuItem, Select, Container, Box, Grid, Link, Modal, Tooltip, IconButton, Stack, Snackbar, AlertProps
} from "@mui/material"
import MuiAlert  from '@mui/material/Alert';

import {api} from "../wailsjs/go/models"
import {EventsOn} from "../wailsjs/runtime"
import {Info} from "@mui/icons-material"

const theme = createTheme()
const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
    props,
    ref,
) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});
function App() {
    const [open, setOpen] = useState(false);

    const handleClick = () => {
        setOpen(true);
    };

    const handleClose = (event?: SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpen(false);
    };
    const [showConfig, setShowConfig] = useState<boolean>(false)
    const [showLogin, setShowLogin] = useState<boolean>(true)

    const [username, setName] = useState('')
    const [password, setPassword] = useState('')
    const [sessionId, setSessionId] = useState('')
    const [remember, setRemember] = useState<boolean>(false)
    const [message, setMessage] = useState('')
    useEffect(() => {
        EventsOn("preferences", ()=> {
            setShowConfig(true)
        })
        IsSet().then((isSet) => {
            console.log("isSet", isSet)
            if (!isSet) {
                setShowConfig(true)
            } else {
                GetConfig().then((c) => {
                    if (c !== null) {
                        c.isProxy ? setProxyValue("yes") : setProxyValue("no")
                        setProxy(c.isProxy)
                        setBee(c.bee)
                        setBatch(c.batch)
                        setNetwork(c.network)
                        setRPC(c.rpc)
                    }
                    Start(c).catch(err => {
                        showError(err)
                    })
                })
            }
        })

        HasRemembered().then((isSet) => {
            console.log("HasRemembered", isSet)
            if (!isSet) {
                setRemember(true)
            }
        })
        Get().then(async (acc) => {
            console.log(acc)
            if (acc.Username === "" || acc.Password === "") {
                return
            }
            try {
                setName(acc.Username)
                setPassword(acc.Password)
                let sId = await Login(acc.Username, acc.Password)
                setShowLogin(false)
                setSessionId(sId)
                let p = await GetPodsList(sId)
                setPods(p)
            }
            catch(e: any) {
                console.log(e)
                showError(e)
            }

        })
    }, [])
    const [pods, setPods] = useState<string[]>([])
    const updateName = (e: any) => setName(e.target.value)
    const updatePassword = (e: any) => setPassword(e.target.value)
    const updateRemember = (e: any) => setRemember(e.target.checked)

    const mount = async  (e: any) => {
        if (e.target.checked) {
            // TODO need to check how mount point can be passed for Windows and linux
            try {
                await Mount(e.target.value, sessionId, "/tmp/"+e.target.value, false)
            }
            catch(e: any) {
                showError(e)
            }
        } else {
            try {
                await Unmount(e.target.value, sessionId)
            }
            catch(e: any) {
                showError(e)
            }
        }
    }
    const [isProxy, setProxy] = useState<boolean>(true)
    const [proxyValue, setProxyValue] = useState('yes')
    const [bee, setBee] = useState('https://bee-1.dev.fairdatasociety.org')
    const [batch, setBatch] = useState('')
    const [rpc, setRPC] = useState('https://xdai.dev.fairdatasociety.org')
    const [network, setNetwork] = useState('testnet')
    const updateProxy = (e: any) => {
        if (e.target.value=== "no") {
            setProxy(false)
        } else {
            setProxy(true)
        }
    }

    const updateBee = (e: any) => setBee(e.target.value)
    const updateBatch = (e: any) => setBatch(e.target.value)
    const updateRPC = (e: any) => setRPC(e.target.value)
    const updateNetwork = (e: any) => setNetwork(e.target.value)

    async function closeSettings() {
        setShowConfig(false)
    }

    async function initFairOs() {
        if (remember) {
            await Close()
        }
        let cfg: api.FairOSConfig = {
            "isProxy": isProxy,
            "bee": bee,
            "batch": batch,
            "rpc": rpc,
            "network": network,
        }
        try {
            await SetupConfig(bee, batch, network, rpc, isProxy)
            await Start(cfg)
            setShowConfig(false)
        } catch (e: any) {
            showError(e)
        }
    }

    async function login() {
        try {
            let sId = await Login(username, password)
            setSessionId(sId)
            setShowLogin(false)
            let p = await GetPodsList(sId)
            setPods(p)
            if (remember) {
                await RememberPassword(username, password)
            } else {
                await ForgetPassword()
            }
        }
        catch(e: any) {
            showError(e)
        }
    }

    function showError(error: any) {
        if (typeof error === "string") {
            setMessage(error.toUpperCase())
        } else if (error instanceof Error) {
            setMessage(error.message) // works, `e` narrowed to Error
        }
        setOpen(true);
    }

    return (
        <div id="App">
            <Snackbar open={open} onClose={handleClose}>
                <Alert onClose={handleClose} severity="error" sx={{ width: '100%' }}>
                    {message}
                </Alert>
            </Snackbar>
            <img src={logo} id="logo" alt="logo"/>
            <Modal
                open={showConfig}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        boxShadow: 24,
                        bgcolor: 'grey',
                        p: 4,
                    }}

                >
                    <FormGroup>
                        <FormLabel id="demo-controlled-radio-buttons-group">Is your bee node running behind proxy?</FormLabel>
                        <RadioGroup
                            aria-labelledby="demo-controlled-radio-buttons-group"
                            name="controlled-radio-buttons-group"
                            onChange={updateProxy}
                            value={proxyValue}
                        >
                            <Grid container>
                                <Grid item>
                                    <FormControlLabel value={"no"} control={<Radio />} label="No" />
                                </Grid>
                                <Grid item>
                                    <FormControlLabel value={"yes"} control={<Radio />} label="Yes" />
                                </Grid>
                            </Grid>
                        </RadioGroup>
                        <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
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
                            <Tooltip title="Bee API endpoint">
                                <IconButton>
                                    <Info />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
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
                            <Tooltip title="BatchID to use for uploads">
                                <IconButton>
                                    <Info />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
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
                            <Tooltip title="RPC Endpoint for ENS based authentication">
                                <IconButton>
                                    <Info />
                                </IconButton>
                            </Tooltip>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Select
                                required
                                fullWidth
                                id="network"
                                label="Network"
                                onChange={updateNetwork}
                                displayEmpty={true}
                                value={network}
                            >
                                <MenuItem value={"testnet"}>Testnet</MenuItem>
                                <MenuItem value={"play"}>FDP play</MenuItem>
                            </Select>
                            <Tooltip title="Specify Network type for ENS based authentication">
                                <IconButton>
                                    <Info />
                                </IconButton>
                            </Tooltip>
                        </Box>
                        <Stack mt={3} mb={3} spacing={2} direction="row">
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={closeSettings}
                            >
                                Close
                            </Button>
                            <Button
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                                onClick={initFairOs}
                            >
                                Start
                            </Button>
                        </Stack>
                    </FormGroup>
                </Box>
            </Modal>

            {(() => {
                if (showLogin) {
                    return (
                        <ThemeProvider theme={theme}>
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
                                            control={<Checkbox color="primary" onChange={updateRemember} />}
                                            label="Remember me"
                                        />
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            sx={{ mt: 3, mb: 2 }}
                                            onClick={login}
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
                        </ThemeProvider>
                    )
                }
            })()}

            <ThemeProvider theme={theme}>
                <Container component="main" maxWidth="xs">
                    <FormGroup>
                        {pods.map((pod) => (
                            <Grid container>
                                <Grid item>
                                    <FormControlLabel control={<Checkbox onChange={mount} value={pod} color="primary"/>} label={pod} />
                                </Grid>
                            </Grid>
                        ))}
                    </FormGroup>
                </Container>
            </ThemeProvider>
        </div>
    )
}

export default App
