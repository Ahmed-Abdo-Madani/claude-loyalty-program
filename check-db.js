import sequelize from './backend/config/database.js'

async function checkColumns() {
    try {
        const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'businesses'
    `)
        console.log('Columns in "businesses" table:')
        console.log(results.map(r => r.column_name).join(', '))
    } catch (error) {
        console.error('Error checking columns:', error)
    } finally {
        process.exit()
    }
}

checkColumns()
