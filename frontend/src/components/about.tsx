import { Dialog, DialogContent, DialogTitle, IconButton, Link, Typography } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import {
  openBrowserDatafund,
  openBrowserFairDataSociety,
  openBrowserFairOS,
  openBrowserFDPprotocol,
  openBrowserLicense
} from "../utils/openBrowser"
import logo from "../assets/images/fairdata.svg"
import dfLogo from "../assets/images/datafund.svg"
import { useEffect, useState } from "react";
import { BuildTime, Version } from "../../wailsjs/go/main/about";
import Disclaimer from "./disclaimer";

export interface AlertProps {
  isOpen: boolean
  onClose: () => void
}

function AboutComponent(props: AlertProps) {
  const [version, setVersion] = useState('')
  const [buildTime, setTime] = useState('')
  const [openDisclaimer, setOpenDisclaimer] = useState(true)

  function closeDisclaimer() {
    setOpenDisclaimer(false)
  }

  useEffect(() => {
    Version().then((res) => {
      setVersion(res)
    })
    BuildTime().then((res) => {
      setTime(res)
    })
  })
  return (
    <>
      <Dialog aria-labelledby="about" open={props.isOpen} onClose={props.onClose}>
        <DialogTitle>
          Fairdrive
          <IconButton
            aria-label="close"
            onClick={props.onClose}
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
            <br/>
            <span onClick={() => setOpenDisclaimer(true)}>Disclaimer</span>
          </Typography>

          <img
            src={logo}
            id="logo"
            alt="logo"
            className="logo-icon"
            onClick={openBrowserFairDataSociety}
          />
          <br/>
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
      </Dialog>
      <Disclaimer isOpen={openDisclaimer} onClose={closeDisclaimer}/>

    </>
  )
}

export default AboutComponent