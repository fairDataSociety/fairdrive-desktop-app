import { handler } from "../../wailsjs/go/models";
import PodMountedInfo = handler.PodMountedInfo;

export interface UserInfo {
  username: string | any
  password: string | any
  mnemonic: string | any
}

export interface AccountInfo {
  userInfo: UserInfo[] | any
  pods: PodMountedInfo[] | any
}