import { handler } from './index.mjs'
import dotenv from 'dotenv'

dotenv.config()

;(async () => {
  const testEvent = {
    url: process.env.TARGET_URL,
  }

  try {
    const response = await handler(testEvent, {})

    if (response.isBase64Encoded) {
      // Convert base64 to binary data to save as an image file locally
      const fs = await import('fs/promises')
      const buffer = Buffer.from(response.body, 'base64')
      await fs.writeFile('screenshot.png', buffer)
      console.log('Screenshot saved as screenshot.png')
    } else {
      console.log(response)
    }
  } catch (error) {
    console.error('Error during local testing:', error)
  }
})()
