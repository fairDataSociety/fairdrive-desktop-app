export function copyUrlToClipboard(location: string) {
  navigator.clipboard.writeText(location).catch((err) => {
    console.log(`Unable to copy to the clipboard: ${err}`)
  })
}