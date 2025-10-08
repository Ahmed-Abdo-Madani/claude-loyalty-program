import { sequelize } from '../config/database.js'

async function columnExists(table, column) {
  const query = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = :table
      AND column_name = :column
  `
  const [results] = await sequelize.query(query, {
    replacements: { table, column }
  })
  return results.length > 0
}

async function run() {
  try {
    console.log('🔧 Checking business table columns...')

    const businessTable = 'businesses'
    const branchTable = 'branches'

    const businessColumns = [
      { name: 'district', type: 'VARCHAR(100)' },
      { name: 'location_id', type: 'VARCHAR(50)' },
      { name: 'location_type', type: "VARCHAR(20)" },
      { name: 'location_hierarchy', type: 'VARCHAR(500)' }
    ]

    for (const col of businessColumns) {
      const exists = await columnExists(businessTable, col.name)
      if (!exists) {
        console.log(`➕ Adding column ${col.name} to ${businessTable}`)
        await sequelize.query(`ALTER TABLE "${businessTable}" ADD COLUMN "${col.name}" ${col.type}`)
      } else {
        console.log(`✅ Column ${col.name} already exists in ${businessTable}`)
      }
    }

    const branchColumns = [
      { name: 'region', type: 'VARCHAR(100)' },
      { name: 'district', type: 'VARCHAR(100)' },
      { name: 'location_id', type: 'VARCHAR(50)' },
      { name: 'location_type', type: "VARCHAR(20)" },
      { name: 'location_hierarchy', type: 'VARCHAR(500)' }
    ]

    for (const col of branchColumns) {
      const exists = await columnExists(branchTable, col.name)
      if (!exists) {
        console.log(`➕ Adding column ${col.name} to ${branchTable}`)
        await sequelize.query(`ALTER TABLE "${branchTable}" ADD COLUMN "${col.name}" ${col.type}`)
      } else {
        console.log(`✅ Column ${col.name} already exists in ${branchTable}`)
      }
    }

    console.log('✔️ Migration complete')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

run()
