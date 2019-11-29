export default function main() {
  console.log(getUserAgent())
}

function getUserAgent(): string {
  return window.navigator.userAgent
}
