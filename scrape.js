// ============================================================================|
/*
* Project: Scraping example
*
* Purpose: NAEK task - scrape a demo shop https://demo-shop.natek.eu
*
* Description:
*
* Scrapes the page and stores the results in the files
* ./demo-shop.natek.eu/hierarchy.json and ./demo-shop.natek.eu/products.json.
*
* Usage:
*
* node scrape https://demo-shop.natek.eu
*
* Author: Emil Usunov <emil@hearit.io>
*
* License: MIT
*
*/
// ============================================================================|
'use strict'
const fs = require('fs').promises

const supportedInputUrls = ['https://demo-shop.natek.eu']

const inputUrl = process.argv[2]
if (!inputUrl) {
  console.error('Usage: node scrape.js <url>')
  process.exit(1)
}
if (!supportedInputUrls.includes(inputUrl)) {
  console.error(`URL '${inputUrl}' is not supported!`)
  process.exit(1)
}
const url = new URL(inputUrl)

// Use the corresponding scrape package
const { scrape } = require(`./lib/${url.hostname}`)

// ----------------------------------------------------------------------------|
async function main () {
  try {
    // Do the job
    const data = await scrape(inputUrl)

    // Store the files
    try {
      await fs.access(`./${url.hostname}`)
    } catch {
      await fs.mkdir(`./${url.hostname}`)
    }
    await fs.writeFile(`./${url.hostname}/hierarchy.json`,
      JSON.stringify(data.hierarchy, null, 2))
    await fs.writeFile(`./${url.hostname}/products.json`,
      JSON.stringify(data.products, null, 2))

    process.exit(0)
  } catch (error) {
    console.log(error)
    process.exit(1)
  }
}
main()
