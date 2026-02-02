async function checkPublicMenuResponse() {
    const fetch = await import('node-fetch').then(mod => mod.default)
    const url = 'http://localhost:3001/api/business/public/menu/biz_6e4e14a5dee957b1e6a04936df?type=business'

    try {
        const response = await fetch(url)
        console.log('Status:', response.status)
        const data = await response.json()

        if (data.success && data.data && data.data.menu && data.data.menu.business) {
            const b = data.data.menu.business
            console.log('Business Fields returned:', Object.keys(b).filter(k => k.includes('_url')))
            console.log('Instagram:', b.instagram_url)
            console.log('Snapchat:', b.snapchat_url)
            console.log('Facebook:', b.facebook_url)
        } else {
            console.log('Structure seems wrong:', JSON.stringify(data, null, 2).substring(0, 500))
        }
    } catch (e) {
        console.error(e)
    }
}

checkPublicMenuResponse()
