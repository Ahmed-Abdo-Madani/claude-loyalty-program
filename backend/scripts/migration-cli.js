/**
 * Migration CLI - Interactive command-line interface for migration management
 * 
 * Purpose: Provide a user-friendly interface for managing database migrations
 * without needing to remember npm script names or commands.
 * 
 * Usage: npm run migrate:cli
 * 
 * Date: 2025-02-03
 */

import AutoMigrationRunner from '../services/AutoMigrationRunner.js'
import logger from '../config/logger.js'
import sequelize from '../config/database.js'
import readline from 'readline'

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
}

/**
 * Display the main menu
 */
function displayMenu() {
  console.log('\n')
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║  🗄️  Migration Management CLI                              ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('\n')
  console.log(`${colors.cyan}1.${colors.reset} Check migration status`)
  console.log(`${colors.cyan}2.${colors.reset} List pending migrations`)
  console.log(`${colors.cyan}3.${colors.reset} Run pending migrations`)
  console.log(`${colors.cyan}4.${colors.reset} Validate migration integrity`)
  console.log(`${colors.cyan}5.${colors.reset} View migration history`)
  console.log(`${colors.cyan}6.${colors.reset} Dry-run (test without executing)`)
  console.log(`${colors.cyan}7.${colors.reset} Exit`)
  console.log('\n')
}

/**
 * Prompt user for input
 */
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim())
    })
  })
}

/**
 * Display migration status
 */
async function checkStatus() {
  console.log('\n' + colors.cyan + '📊 Checking migration status...' + colors.reset)
  
  try {
    const status = await AutoMigrationRunner.getMigrationStatus()
    
    console.log('\n┌─────────────────────────────────────┐')
    console.log('│  Migration Status Summary           │')
    console.log('└─────────────────────────────────────┘')
    console.log(`${colors.cyan}Total migrations:${colors.reset}     ${status.total}`)
    console.log(`${colors.green}Applied (success):${colors.reset}    ${status.applied}`)
    console.log(`${colors.yellow}Pending:${colors.reset}              ${status.pending}`)
    console.log(`${colors.red}Failed:${colors.reset}               ${status.failed}`)
    
    if (status.warning) {
      console.log(`\n${colors.yellow}⚠️  Warning: ${status.warning}${colors.reset}`)
    }
    
    console.log('\n' + colors.green + '✅ Status check complete' + colors.reset)
    
  } catch (error) {
    console.log(`\n${colors.red}❌ Error checking status: ${error.message}${colors.reset}`)
  }
}

/**
 * List pending migrations
 */
async function listPending() {
  console.log('\n' + colors.cyan + '📋 Listing pending migrations...' + colors.reset)
  
  try {
    const pending = await AutoMigrationRunner.getPendingMigrations()
    
    if (pending.length === 0) {
      console.log(`\n${colors.green}✅ No pending migrations - database is up to date${colors.reset}`)
    } else {
      console.log(`\n${colors.yellow}Found ${pending.length} pending migration(s):${colors.reset}\n`)
      pending.forEach((migration, index) => {
        console.log(`  ${colors.cyan}${index + 1}.${colors.reset} ${migration}`)
      })
    }
    
  } catch (error) {
    console.log(`\n${colors.red}❌ Error listing pending migrations: ${error.message}${colors.reset}`)
  }
}

/**
 * Run pending migrations
 */
async function runMigrations() {
  console.log('\n' + colors.cyan + '🔄 Checking for pending migrations...' + colors.reset)
  
  try {
    const pending = await AutoMigrationRunner.getPendingMigrations()
    
    if (pending.length === 0) {
      console.log(`\n${colors.green}✅ No pending migrations to run${colors.reset}`)
      return
    }
    
    console.log(`\n${colors.yellow}Found ${pending.length} pending migration(s):${colors.reset}`)
    pending.forEach((migration, index) => {
      console.log(`  ${index + 1}. ${migration}`)
    })
    
    const answer = await prompt(`\n${colors.yellow}Run these migrations? (y/n):${colors.reset} `)
    
    if (answer.toLowerCase() !== 'y') {
      console.log(`\n${colors.gray}Migration cancelled by user${colors.reset}`)
      return
    }
    
    console.log(`\n${colors.cyan}🚀 Running migrations...${colors.reset}\n`)
    
    const result = await AutoMigrationRunner.runPendingMigrations({
      stopOnError: true,
      lockTimeout: 30000
    })
    
    console.log('\n┌─────────────────────────────────────┐')
    console.log('│  Migration Results                  │')
    console.log('└─────────────────────────────────────┘')
    console.log(`${colors.cyan}Total:${colors.reset}      ${result.total}`)
    console.log(`${colors.green}Applied:${colors.reset}    ${result.applied}`)
    console.log(`${colors.red}Failed:${colors.reset}     ${result.failed}`)
    console.log(`${colors.cyan}Time:${colors.reset}       ${result.totalExecutionTime}ms`)
    
    if (result.failed > 0) {
      console.log(`\n${colors.red}❌ Some migrations failed${colors.reset}`)
      result.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`\n${colors.red}Failed: ${r.migration}${colors.reset}`)
          console.log(`  Error: ${r.error}`)
        })
    } else {
      console.log(`\n${colors.green}✅ All migrations completed successfully${colors.reset}`)
    }
    
  } catch (error) {
    console.log(`\n${colors.red}❌ Error running migrations: ${error.message}${colors.reset}`)
  }
}

/**
 * Validate migration integrity
 */
async function validateIntegrity() {
  console.log('\n' + colors.cyan + '🔍 Validating migration integrity...' + colors.reset)
  
  try {
    const result = await AutoMigrationRunner.validateMigrationIntegrity()
    
    console.log(`\n${colors.cyan}Checked: ${result.totalChecked} migration(s)${colors.reset}`)
    
    if (result.valid) {
      console.log(`\n${colors.green}✅ All migrations passed integrity validation${colors.reset}`)
    } else {
      console.log(`\n${colors.yellow}⚠️  Found ${result.mismatches.length} integrity issue(s):${colors.reset}\n`)
      result.mismatches.forEach((m, index) => {
        const icon = m.severity === 'error' ? '❌' : '⚠️'
        console.log(`  ${icon} ${m.migration}`)
        console.log(`     Issue: ${m.issue}`)
        if (m.storedChecksum && m.currentChecksum) {
          console.log(`     ${colors.gray}Stored:  ${m.storedChecksum}${colors.reset}`)
          console.log(`     ${colors.gray}Current: ${m.currentChecksum}${colors.reset}`)
        }
      })
      
      console.log(`\n${colors.yellow}Recommendation: Never modify applied migrations. Create a new migration instead.${colors.reset}`)
    }
    
  } catch (error) {
    console.log(`\n${colors.red}❌ Error validating integrity: ${error.message}${colors.reset}`)
  }
}

/**
 * View migration history
 */
async function viewHistory() {
  console.log('\n' + colors.cyan + '📜 Fetching migration history...' + colors.reset)
  
  try {
    const status = await AutoMigrationRunner.getMigrationStatus()
    
    if (status.appliedMigrations.length === 0) {
      console.log(`\n${colors.gray}No migrations have been applied yet${colors.reset}`)
      return
    }
    
    console.log(`\n${colors.cyan}Recently applied migrations (last 10):${colors.reset}\n`)
    console.log('┌──────────────────────────────────────────────────────────────────────┐')
    console.log('│ Migration                                    │ Time    │ Status      │')
    console.log('├──────────────────────────────────────────────────────────────────────┤')
    
    const recent = status.appliedMigrations.slice(0, 10)
    recent.forEach(m => {
      const name = m.migration_name.padEnd(45).substring(0, 45)
      const time = m.execution_time_ms ? `${m.execution_time_ms}ms`.padEnd(8) : 'N/A'.padEnd(8)
      const statusIcon = m.status === 'success' ? '✅' : m.status === 'failed' ? '❌' : '🔄'
      const statusText = `${statusIcon} ${m.status}`.padEnd(12)
      console.log(`│ ${name}│ ${time}│ ${statusText}│`)
    })
    
    console.log('└──────────────────────────────────────────────────────────────────────┘')
    
    if (status.failedMigrations && status.failedMigrations.length > 0) {
      console.log(`\n${colors.red}Failed migrations:${colors.reset}`)
      status.failedMigrations.forEach(m => {
        console.log(`  ❌ ${m.migration_name}`)
        if (m.error_message) {
          console.log(`     ${colors.gray}Error: ${m.error_message}${colors.reset}`)
        }
      })
    }
    
  } catch (error) {
    console.log(`\n${colors.red}❌ Error fetching history: ${error.message}${colors.reset}`)
  }
}

/**
 * Dry-run migrations
 */
async function dryRun() {
  console.log('\n' + colors.cyan + '🧪 Dry-run mode - showing what would execute...' + colors.reset)
  
  try {
    const result = await AutoMigrationRunner.runPendingMigrations({
      dryRun: true,
      stopOnError: true,
      lockTimeout: 30000
    })
    
    if (result.skipped === 0) {
      console.log(`\n${colors.green}✅ No pending migrations - database is up to date${colors.reset}`)
    } else {
      console.log(`\n${colors.yellow}Would run ${result.skipped} migration(s)${colors.reset}`)
      console.log(`\n${colors.gray}Run 'option 3' to execute these migrations${colors.reset}`)
    }
    
  } catch (error) {
    console.log(`\n${colors.red}❌ Error during dry-run: ${error.message}${colors.reset}`)
  }
}

/**
 * Main CLI loop
 */
async function main() {
  try {
    // Test database connection
    await sequelize.authenticate()
    
    let running = true
    
    while (running) {
      displayMenu()
      const choice = await prompt(`${colors.cyan}Select option (1-7):${colors.reset} `)
      
      switch (choice) {
        case '1':
          await checkStatus()
          break
        case '2':
          await listPending()
          break
        case '3':
          await runMigrations()
          break
        case '4':
          await validateIntegrity()
          break
        case '5':
          await viewHistory()
          break
        case '6':
          await dryRun()
          break
        case '7':
          console.log(`\n${colors.cyan}👋 Goodbye!${colors.reset}\n`)
          running = false
          break
        default:
          console.log(`\n${colors.red}Invalid option. Please select 1-7.${colors.reset}`)
      }
      
      if (running) {
        await prompt(`\n${colors.gray}Press Enter to continue...${colors.reset}`)
      }
    }
    
    // Close connections
    await sequelize.close()
    rl.close()
    process.exit(0)
    
  } catch (error) {
    console.log(`\n${colors.red}❌ Error: ${error.message}${colors.reset}`)
    console.log(`\n${colors.gray}Stack: ${error.stack}${colors.reset}`)
    
    try {
      await sequelize.close()
    } catch (closeError) {
      // Ignore
    }
    
    rl.close()
    process.exit(1)
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log(`\n\n${colors.yellow}Interrupted by user${colors.reset}`)
  try {
    await sequelize.close()
  } catch (error) {
    // Ignore
  }
  rl.close()
  process.exit(0)
})

// Run main function
main().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error)
  process.exit(1)
})
