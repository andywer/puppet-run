// cowsays.js
import * as cowsay from "cowsay"

export default async function () {
  const text = window.atob("SSBsaXZlIGluIGEgYnJvd3NlciBub3c=")
  console.log(cowsay.say({ text }))
}
