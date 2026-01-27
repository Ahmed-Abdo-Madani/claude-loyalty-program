import sequelize from './backend/config/database.js'
import Branch from './backend/models/Branch.js'

async function checkBranches() {
    try {
        await sequelize.authenticate()
        console.log('Connection has been established successfully.')

        const branch = await Branch.findOne()
        if (branch) {
            console.log('Found branch:', JSON.stringify(branch.toJSON(), null, 2))
        } else {
            console.log('No branches found.')
        }
    } catch (error) {
        console.error('Unable to connect to the database:', error)
    } finally {
        await sequelize.close()
    }
}

checkBranches()
