const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

module.exports = async function main() {
  await delay(200)
  console.log("Delayed by 200ms")
}
