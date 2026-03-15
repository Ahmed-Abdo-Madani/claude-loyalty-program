import sequelize from '../config/database.js'

export async function up() {
    const [columnExists] = await sequelize.query(`
    SELECT column_name, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'notification_logs' 
    AND column_name = 'message_content'
  `)

    if (columnExists.length > 0 && columnExists[0].is_nullable === 'NO') {
        await sequelize.query(`
      ALTER TABLE notification_logs 
      ALTER COLUMN message_content DROP NOT NULL
    `)
        console.log('✅ Made notification_logs.message_content nullable')
    } else {
        console.log('⚠️ notification_logs.message_content is already nullable or does not exist, skipping...')
    }
}

export async function down() {
    await sequelize.query(`
    ALTER TABLE notification_logs 
    ALTER COLUMN message_content SET NOT NULL
  `)
    console.log('✅ Reverted notification_logs.message_content to NOT NULL')
}

export default { up, down }
