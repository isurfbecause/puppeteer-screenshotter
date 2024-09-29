import dotenv from 'dotenv'
dotenv.config()

let puppeteer
let chromium
let executablePath

if (process.env.IS_LOCAL) {
  puppeteer = await import('puppeteer') // Local testing
  executablePath = undefined // Puppeteer will use its own Chromium
} else {
  puppeteer = await import('puppeteer-core') // AWS Lambda
  chromium = await import('chrome-aws-lambda')
  executablePath = await chromium.executablePath
}

export const handler = async (event, context) => {
  let browser = null

  try {
    browser = await puppeteer.launch({
      args: chromium ? [...chromium.args, '--hide-scrollbars', '--disable-web-security'] : [],
      defaultViewport: chromium ? chromium.defaultViewport : null,
      executablePath,
      headless: chromium ? chromium.headless : true,
    })

    const page = await browser.newPage()
    const targetUrl = event.url || process.env.TARGET_URL

    await page.goto(targetUrl, { waitUntil: 'networkidle2' })

    // Wait for results to appear
    await page.waitForSelector('[class^="MuiBox-root mui-style-"]')

    await page.setViewport({
      width: 1280,
      height: 5000, // Set a large enough height to cover more content before scrolling
    })

    // Scroll to the bottom of the page to dynamically load all products
    // Scroll to the middle of the page
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2)
    })

    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullpage: true,
      type: 'jpeg',
      quality: 50,
    })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
      },
      body: screenshot,
      isBase64Encoded: true,
    }
  } catch (error) {
    console.error('Error taking screenshot:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to take screenshot' }),
    }
  } finally {
    if (browser !== null) {
      await browser.close()
    }
  }
}
