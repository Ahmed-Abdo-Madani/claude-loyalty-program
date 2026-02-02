import sequelize from '../config/database.js'

export async function up() {
    console.log('🔧 Starting migration: Add social media links...')

    // Add facebook_url column
    const [facebookExists] = await sequelize.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    AND column_name = 'facebook_url'
  `)

    if (facebookExists.length === 0) {
        await sequelize.query(`
      ALTER TABLE businesses 
      ADD COLUMN facebook_url VARCHAR(500)
    `)
        console.log('✅ Column facebook_url added')
    } else {
        console.log('⚠️ Column facebook_url already exists, skipping...')
    }

    // Add instagram_url column
    const [instagramExists] = await sequelize.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    AND column_name = 'instagram_url'
  `)

    if (instagramExists.length === 0) {
        await sequelize.query(`
      ALTER TABLE businesses 
      ADD COLUMN instagram_url VARCHAR(500)
    `)
        console.log('✅ Column instagram_url added')
    } else {
        console.log('⚠️ Column instagram_url already exists, skipping...')
    }

    // Add twitter_url column
    const [twitterExists] = await sequelize.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    AND column_name = 'twitter_url'
  `)

    if (twitterExists.length === 0) {
        await sequelize.query(`
      ALTER TABLE businesses 
      ADD COLUMN twitter_url VARCHAR(500)
    `)
        console.log('✅ Column twitter_url added')
    } else {
        console.log('⚠️ Column twitter_url already exists, skipping...')
    }

    // Add snapchat_url column
    const [snapchatExists] = await sequelize.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    AND column_name = 'snapchat_url'
  `)

    if (snapchatExists.length === 0) {
        await sequelize.query(`
      ALTER TABLE businesses 
      ADD COLUMN snapchat_url VARCHAR(500)
    `)
        console.log('✅ Column snapchat_url added')
    } else {
        console.log('⚠️ Column snapchat_url already exists, skipping...')
    }

    console.log('🎉 Migration completed successfully!')
}

export async function down() {
    console.log('🔧 Rolling back migration: Add social media links...')

    await sequelize.query(`
    ALTER TABLE businesses 
    DROP COLUMN IF EXISTS facebook_url
  `)

    await sequelize.query(`
    ALTER TABLE businesses 
    DROP COLUMN IF EXISTS instagram_url
  `)

    await sequelize.query(`
    ALTER TABLE businesses 
    DROP COLUMN IF EXISTS twitter_url
  `)

    await sequelize.query(`
    ALTER TABLE businesses 
    DROP COLUMN IF EXISTS snapchat_url
  `)

    console.log('✅ Rollback completed')
}

export default { up, down }
