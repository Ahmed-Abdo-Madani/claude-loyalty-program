import { publicApi, endpoints } from './src/config/api.js'

// Mocking fetch as we are in Node environment
global.fetch = async (url, options) => {
    // console.log('Fetching:', url)
    const { default: fetch } = await import('node-fetch')
    return fetch(url, options)
}

// We need to construct the URL manually because we don't have the full React environment
const BASE_URL = 'http://localhost:3001'
const identifier = 'biz_6e4e14a5dee957b1e6a04936df' // From previous logs

async function checkPublicMenu() {
    try {
        const url = `${BASE_URL}/api/business/public/menu/${identifier}?type=business`
        console.log('Requesting:', url)
        const response = await fetch(url)
        const data = await response.json()

        if (data.success) {
            console.log('Public Menu Business Data:')
            const b = data.data.menu.business
            console.log(JSON.stringify({
                business_name: b.business_name,
                facebook_url: b.facebook_url,
                instagram_url: b.instagram_url,
                twitter_url: b.twitter_url,
                snapchat_url: b.snapchat_url
            }, null, 2))
        } else {
            console.error('Failed to fetch menu:', data)
        }
    } catch (error) {
        console.error('Error:', error)
    }
}

checkPublicMenu()
