import {forwardRef, SyntheticEvent, useEffect, useState} from 'react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import logo from './assets/images/logo-universal.png'
import './App.css'
import {Login, Mount, GetPodsList, Unmount, Start, Close, Logout, CreatePod} from "../wailsjs/go/handler/Handler"
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
    DialogTitle, DialogContent, Typography, styled, DialogContentText, DialogActions
} from "@mui/material"
import MuiAlert  from '@mui/material/Alert'

import {api} from "../wailsjs/go/models"
import {EventsEmit, EventsOn} from "../wailsjs/runtime"
import {Info} from "@mui/icons-material"
import CloseIcon from '@mui/icons-material/Close'
import {BuildTime, Version} from "../wailsjs/go/main/about";

const theme = createTheme()
const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
    props,
    ref,
) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const AboutDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialogContent-root': {
        padding: theme.spacing(2),
    },
    '& .MuiDialogActions-root': {
        padding: theme.spacing(1),
    },
}));

function App() {
    const [open, setOpen] = useState(false);
    const handleClose = (event?: SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpen(false);
    };

    const [showAbout, setShowAbout] = useState<boolean>(false)
    const handleAboutClose = () => {
        setShowAbout(false);
    };

    const [showPodNew, setPodNew] = useState<boolean>(false)
    const handlePodNewClose = () => {
        setPodNew(false);
    };
    const [newPodName, setNewPodName] = useState('')

    const handlePodNew = async () => {
        try {
            if (newPodName !== "") {
                await CreatePod(newPodName)
                setPodNew(false);
                setNewPodName('')
                let p = await GetPodsList()
                setPods(p)
                setShowPods(true)
            }
        } catch(e: any) {
            showError(e)
        }
    };

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
        EventsOn("preferences", ()=> {
            setShowConfig(true)
        })
        EventsOn("podNew", ()=> {
            setPodNew(true)
        })
        EventsOn("about", ()=> {
            setShowAbout(true)
        })
        EventsOn("logout", async ()=> {
            try {
                await Logout()
                EventsEmit("disableMenus")
                setShowLogin(true)
                setShowPods(false)
                setPods([])
                await ForgetPassword()
            } catch(e: any) {
                showError(e)
            }
        })

        Version().then(res => {
            setVersion(res)
        })
        BuildTime().then(res => {
            setTime(res)
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
                    }).then(res => {
                        Get().then(async (acc) => {
                            console.log(acc)
                            if (acc.Username === "" || acc.Password === "") {
                                EventsEmit("disableMenus")
                                return
                            }
                            try {
                                setName(acc.Username)
                                setPassword(acc.Password)
                                await Login(acc.Username, acc.Password)
                                setShowLogin(false)
                                let p = await GetPodsList()
                                setPods(p)
                            }
                            catch(e: any) {
                                EventsEmit("disableMenus")
                                showError(e)
                            }
                        })
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
    }, [])
    const [pods, setPods] = useState<string[]>([])
    const updateName = (e: any) => setName(e.target.value)
    const updatePassword = (e: any) => setPassword(e.target.value)
    const updateRemember = (e: any) => setRemember(e.target.checked)

    const mount = async  (e: any) => {
        if (e.target.checked) {
            // TODO need to check how mount point can be passed for Windows and linux
            try {
                await Mount(e.target.value, "/tmp/"+e.target.value, false)
            }
            catch(e: any) {
                showError(e)
            }
        } else {
            try {
                await Unmount(e.target.value)
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
        setProxyValue(e.target.value)
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
    const updateNewPodName = (e: any) => setNewPodName(e.target.value)

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
            await Login(username, password)
            setShowLogin(false)
            let p = await GetPodsList()
            setPods(p)
            setShowPods(true)
            if (remember) {
                await RememberPassword(username, password)
            } else {
                await ForgetPassword()
            }
            EventsEmit("enableMenus")
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
            {/*shows error*/}
            <Snackbar open={open} onClose={handleClose}>
                <Alert onClose={handleClose} severity="error" sx={{ width: '100%' }}>
                    {message}
                </Alert>
            </Snackbar>

            {/*logo*/}
            <img src={logo} id="logo" alt="logo"/>

            {/*settings modal*/}
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

            {/*about dialog*/}
            {(() => {
                if (showAbout) {
                    return (
                        <AboutDialog
                            aria-labelledby="about-title"
                            open={showAbout}
                        >
                            <DialogTitle sx={{ m: 0, p: 2, fontSize: "small" }}>
                                About FDA
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
                                <Typography gutterBottom variant="h6" align="left">
                                    Fairdrive Desktop App
                                </Typography>
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
                                        Powered by ORG
                                    </Link>
                                </Typography>
                                <Typography gutterBottom align="left">
                                    FFA Copyright FDS 2021
                                </Typography>
                            </DialogContent>
                        </AboutDialog>
                    )
                }

                {/*pod new dialog*/}
                if (showPodNew) {
                    return (
                        <Dialog open={showPodNew} onClose={handlePodNewClose}>
                            <DialogTitle>Create new Pod</DialogTitle>
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
                                <Button onClick={handlePodNewClose}>Cancel</Button>
                                <Button onClick={handlePodNew}>Create</Button>
                            </DialogActions>
                        </Dialog>
                    )
                }

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
                                            label="Remember and Keep me logged-in"
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
                if (showPods) {
                    return (
                        <ThemeProvider theme={theme}>
                            <Container component="main" maxWidth="xs">
                                <FormGroup>
                                    {pods.map((pod) => (
                                        <Grid container>
                                            <Grid item>
                                                <FormControlLabel
                                                    control={<Checkbox onChange={mount} value={pod} color="primary"/>}
                                                    label={pod}/>
                                            </Grid>
                                        </Grid>
                                    ))}
                                </FormGroup>
                            </Container>
                        </ThemeProvider>
                    )
                }
            })()}
        </div>
    )
}

export default App
