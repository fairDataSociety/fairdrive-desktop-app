import {useEffect, useState} from 'react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import DeleteIcon from '@mui/icons-material/Delete';
import logo from './assets/images/logo-universal.png'
import './App.css'
import {Login, Mount, GetPodsList, Unmount, Start} from "../wailsjs/go/handler/Handler"
import {SetupConfig, IsSet} from "../wailsjs/go/main/conf"
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
    InputLabel, MenuItem, Select, Container, Box, Grid, Link, Modal, Tooltip, IconButton
} from "@mui/material"
import {api} from "../wailsjs/go/models"
import {EventsOn} from "../wailsjs/runtime"
import {Info} from "@mui/icons-material";

const theme = createTheme()

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

function App() {

    const [showConfig, setShowConfig] = useState<boolean>(false)
    const [showLogin, setShowLogin] = useState<boolean>(true)

    const [username, setName] = useState('')
    const [password, setPassword] = useState('')
    const [sessionId, setSessionId] = useState('')
    const [remember, setRemember] = useState<boolean>(false)
    useEffect(() => {
        EventsOn("preferences", ()=> {
            setShowConfig(true)
        })
        IsSet().then((isSet) => {
            console.log("isSet", isSet)
            if (!isSet) {
                setShowConfig(true)
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
            setName(acc.Username)
            setPassword(acc.Password)
            let sId = await Login(acc.Username, acc.Password);
            setShowLogin(false)
            setSessionId(sId)
            let p = await GetPodsList(sId)
            setPods(p)
        })
    }, []);
    const [pods, setPods] = useState<string[]>([])
    const updateName = (e: any) => setName(e.target.value)
    const updatePassword = (e: any) => setPassword(e.target.value)
    const updateRemember = (e: any) => setRemember(e.target.checked)

    const mount = async  (e: any) => {
        if (e.target.checked) {
            // TODO need to check how mount point can be passed for Windows and linux
            await Mount(e.target.value, sessionId, "/tmp/"+e.target.value, false)
        } else {
            await Unmount(e.target.value, sessionId)
        }
    }
    const [isProxy, setProxy] = useState<boolean>(false);
    const [bee, setBee] = useState('http://localhost:1633');
    const [batch, setBatch] = useState('');
    const [rpc, setRPC] = useState('http://localhost:9545');
    const [network, setNetwork] = useState('play');
    const updateProxy = (e: any) => {
        if (e.target.value=== "no") {
            setProxy(false)
        } else {
            setProxy(true)
        }
    };

    const updateBee = (e: any) => setBee(e.target.value);
    const updateBatch = (e: any) => setBatch(e.target.value);
    const updateRPC = (e: any) => setRPC(e.target.value);
    const updateNetwork = (e: any) => setNetwork(e.target.value);

    async function initFairOs() {
        let cfg: api.FairOSConfig = {
            "isProxy": isProxy,
            "bee": bee,
            "batch": batch,
            "rpc": rpc,
            "network": network,
        }
        await SetupConfig(bee, batch, network, rpc, isProxy)
        await Start(cfg)
        setShowConfig(false)
    }

    async function login() {
        let sId = await Login(username, password);
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

    return (
        <div id="App">
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
                            >
                                <MenuItem value={"testnet"}>Testnet</MenuItem>
                            </Select>
                            <Tooltip title="Specify Network type for ENS based authentication">
                                <IconButton>
                                    <Info />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        <Button
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            onClick={initFairOs}
                        >
                            Start
                        </Button>
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
