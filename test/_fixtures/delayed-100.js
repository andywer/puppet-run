const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

module.exports = async function main() {
  await delay(100)
  console.log("Delayed by 100ms")
}
