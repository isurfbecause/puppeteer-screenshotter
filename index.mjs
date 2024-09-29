import puppeteer from 'puppeteer'
// require('dotenv').config()
;(async () => {
  // Launch a new browser instance
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  // Navigate to the desired webpage
  await page.goto('https://example.com')

  // Take a screenshot and save it as 'example.png'
  await page.screenshot({ path: 'example.png', fullPage: true })

  // Close the browser
  await browser.close()
})()
