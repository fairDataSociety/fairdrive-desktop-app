import { BrowserOpenURL } from "../../wailsjs/runtime";

export function openSignUp() {
  BrowserOpenURL('https://create.fairdatasociety.org/#/register')
}

export function openBrowserLicense() {
  BrowserOpenURL('https://github.com/datafund/fairos-fuse/blob/master/LICENSE')
}
export function openBrowserFairOS() {
  BrowserOpenURL(
    'https://docs.fairos.fairdatasociety.org/docs/fairos-dfs/api-reference',
  )
}
export function openBrowserFDPprotocol() {
  BrowserOpenURL('https://fdp.fairdatasociety.org/')
}

export function openBrowserFairDataSociety() {
  BrowserOpenURL('https://fairdatasociety.org/')
}

export function openBrowserDatafund() {
  BrowserOpenURL('https://datafund.io/')
}