import React from 'react'
import {createRoot} from 'react-dom/client'
import './style.css'
import App from './App'
import { MetaMaskProvider } from "@metamask/sdk-react";

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
    <React.StrictMode>
      <MetaMaskProvider
        debug={true}
        sdkOptions={{
          dappMetadata: {
            name: "Example React Dapp",
            url: window.location.href,
          },
        }}
      >
        <App/>
      </MetaMaskProvider>
    </React.StrictMode>
)
