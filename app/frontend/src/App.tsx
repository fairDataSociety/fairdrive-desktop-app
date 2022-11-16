import {useState} from 'react';
import logo from './assets/images/logo-universal.png';
import './App.css';
import {Login, Mount, GetPodsList, Unmount, Start} from "../wailsjs/go/handler/Handler";
import {SetupConfig, IsSet} from "../wailsjs/go/main/conf";
import {
    TextField,
    Button,
    Checkbox,
    FormGroup,
    FormControlLabel,
    FormLabel,
    RadioGroup,
    Radio,
    InputLabel, MenuItem, Select
} from "@mui/material";
import {api} from "../wailsjs/go/models";

function App() {
    const [username, setName] = useState('');
    const [password, setPassword] = useState('');
    const [sessionId, setSessionid] = useState('');
    const [pods, setPods] = useState<string[]>([]);
    const updateName = (e: any) => setName(e.target.value);
    const updatePassword = (e: any) => setPassword(e.target.value);
    const mount = async  (e: any) => {
        if (e.target.checked) {
            // TODO need to check how mount point can be passed for Windows and linux
            await Mount(e.target.value, password, sessionId, "/tmp/"+e.target.value, false)
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
    }

    async function login() {
        let sId = await Login(username, password);
        setSessionid(sId)
        let p = await GetPodsList(sId)
        setPods(p)
    }

    return (
        <div id="App">
            <img src={logo} id="logo" alt="logo"/>

            <div id="input" className="input-box">
                <FormGroup>
                    <FormLabel id="demo-controlled-radio-buttons-group">Is your bee node running behind proxy?</FormLabel>
                    <RadioGroup
                        aria-labelledby="demo-controlled-radio-buttons-group"
                        name="controlled-radio-buttons-group"
                        onChange={updateProxy}
                    >
                        <FormControlLabel value={"no"} control={<Radio />} label="No" />
                        <FormControlLabel value={"yes"} control={<Radio />} label="Yes" />
                    </RadioGroup>
                    <TextField
                        required
                        id="bee"
                        label="Bee"
                        onChange={updateBee}
                        autoComplete="off"
                    />

                    <TextField
                        required
                        id="batch"
                        label="BatchID"
                        onChange={updateBatch}
                        autoComplete="off"
                    />

                    <TextField
                        required
                        id="rpc"
                        label="RPC"
                        onChange={updateRPC}
                        autoComplete="off"
                    />
                    <InputLabel id="demo-simple-select-label">Network</InputLabel>
                    <Select
                        labelId="demo-simple-select-label"
                        id="demo-simple-select"
                        label="Network"
                        onChange={updateNetwork}
                    >
                        <MenuItem value={"testnet"}>Testnet</MenuItem>
                        <MenuItem value={"play"}>FDP-Play</MenuItem>
                    </Select>

                    <Button variant="contained" onClick={initFairOs}>Start</Button>
                </FormGroup>
            </div>
            <div id="input" className="input-box">
                <TextField
                    required
                    id="username"
                    label="Username"
                    onChange={updateName}
                    autoComplete="off"
                />

                <TextField
                    required
                    id="password"
                    label="Password"
                    onChange={updatePassword}
                    autoComplete="off"
                    type="password"
                />
                {/*<TextField id="username"  autoComplete="off" name="input" type="text"/>*/}
                {/*<TextField id="password" onChange={updatePassword} autoComplete="off" name="input" type="password"/>*/}
                <Button variant="contained" onClick={login}>Login</Button>
            </div>

            <div>
                <FormGroup>
                    {pods.map((pod) => (
                        <FormControlLabel control={<Checkbox onChange={mount} value={pod}/>} label={pod} />
                    ))}
                </FormGroup>
            </div>
        </div>
    )
}

export default App
