import dotenv from 'dotenv'
dotenv.config()

import FormData from 'form-data'
import Mailgun from 'mailgun.js'

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL
const TO_EMAIL = process.env.TO_EMAIL.split(',')
const SEND_EMAIL = process.env.SEND_EMAIL

const mailgun = new Mailgun(FormData)
const mg = mailgun.client({
  username: 'api',
  key: MAILGUN_API_KEY,
})

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

async function sendMail(content) {
  console.log({ EMAIL_DOMAIN, MAILGUN_API_KEY, FROM_EMAIL, TO_EMAIL })

  // Assuming content is a base64 string
  const buffer = Buffer.from(content, 'base64')

  try {
    const messageData = {
      from: process.env.FROM_EMAIL,
      to: process.env.TO_EMAIL,
      subject: 'Puppeteer Screenshot Attachment',
      text: 'Please find the screenshot attached.',
      attachment: {
        data: buffer,
        filename: 'screenshot.jpg', // or 'screenshot.png', depending on format
      },
    }

    const response = await mg.messages.create(process.env.EMAIL_DOMAIN, messageData)
    console.log('Email sent successfully:', response)
  } catch (error) {
    console.error('Error sending email:', error)
  }
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
      height: 2000, // Set a large enough height to cover more content before scrolling
    })

    // Scroll to the bottom of the page to dynamically load all products
    // Scroll to the middle of the page
    // await page.evaluate(() => {
    //   window.scrollTo(0, document.body.scrollHeight / 4)
    // })

    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullpage: false,
      type: 'jpeg',
      quality: 50,
    })

    if (process.env.SEND_EMAIL) {
      await sendMail(screenshot)
    }

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
