
import fetch from 'node-fetch'
import crypto from 'crypto'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const SECRET = process.env.RESEND_WEBHOOK_SECRET || 'whsec_test_secret'
const URL = 'http://localhost:3001/api/webhooks/resend'

if (!process.env.RESEND_WEBHOOK_SECRET) {
    console.warn('Warning: RESEND_WEBHOOK_SECRET not set in .env, using default test secret')
}

// Function to sign payload (Svix format)
function signPayload(payload, secret) {
    const timestamp = Math.floor(Date.now() / 1000)
    const id = `evt_${Date.now()}`

    const toSign = `${id}.${timestamp}.${payload}`

    // Let's handle the secret format
    let key
    if (secret.startsWith('whsec_')) {
        key = Buffer.from(secret.slice(6), 'base64')
    } else {
        key = Buffer.from(secret, 'base64')
    }

    const signature = crypto
        .createHmac('sha256', key)
        .update(toSign)
        .digest('base64')

    return {
        'svix-id': id,
        'svix-timestamp': timestamp.toString(),
        'svix-signature': `v1,${signature}`,
        'Content-Type': 'application/json'
    }
}

async function sendWebhook(type, emailId) {
    console.log(`Sending webhook: ${type} for ${emailId}`)

    const payload = JSON.stringify({
        type: type,
        created_at: new Date().toISOString(),
        data: {
            created_at: new Date().toISOString(),
            email_id: emailId,
            to: ['test@example.com'],
            subject: 'Test Email',
            status: type.replace('email.', '')
        }
    })

    const headers = signPayload(payload, SECRET)

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: headers,
            body: payload
        })

        const data = await response.json()
        console.log(`Response: ${response.status}`, data)
        return response.ok
    } catch (error) {
        console.error('Request failed:', error.message)
        return false
    }
}

// Check arguments
const args = process.argv.slice(2)
if (args.length < 1) {
    console.log(`
Usage: node trigger-resend-webhook.js <email_id> [event_type]
Example: node trigger-resend-webhook.js 550e8400-e29b-41d4-a716-446655440000 email.delivered
Defaults to email.delivered if event_type not specified.
    `)
    process.exit(1)
}

const emailId = args[0]
const eventType = args[1] || 'email.delivered'

sendWebhook(eventType, emailId)
