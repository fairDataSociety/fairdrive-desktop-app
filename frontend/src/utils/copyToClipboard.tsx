import { ClipboardSetText } from "../../wailsjs/runtime";

export function copyUrlToClipboard(location: string) {
  ClipboardSetText(location).then((success: boolean) => {
    if (!success) {
      console.log(`Unable to copy to the clipboard`)
    }
  })
}