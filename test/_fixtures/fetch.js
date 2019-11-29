export default async function main() {
  const response = await fetch("/test.json")
  const json = await response.json()

  console.log(JSON.stringify(json))
}
