import sequelize from './backend/config/database.js'

async function checkBusinessData() {
    try {
        const [results] = await sequelize.query(`
      SELECT business_name, facebook_url, instagram_url, twitter_url, snapchat_url 
      FROM businesses 
      LIMIT 5
    `)
        console.log('Business Data:')
        console.log(JSON.stringify(results, null, 2))
    } catch (error) {
        console.error('Error checking data:', error)
    } finally {
        process.exit()
    }
}

checkBusinessData()
