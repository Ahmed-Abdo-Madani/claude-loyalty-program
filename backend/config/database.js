import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'

dotenv.config()

// Database configuration
const config = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'loyalty_platform_dev',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false, // Disabled SQL query logging for cleaner terminal output
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    },
    pool: {
      max: 20,
      min: 0,
      acquire: 60000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
}

// Initialize Sequelize
const env = process.env.NODE_ENV || 'development'

// In production, use DATABASE_URL if available (Render.com provides this)
let sequelize
if (env === 'production' && process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    },
    pool: {
      max: 20,
      min: 0,
      acquire: 60000,
      idle: 10000
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  })
} else {
  sequelize = new Sequelize(config[env])
}

// Database connection pool monitoring
// Note: Sequelize doesn't expose direct pool events, so we use periodic monitoring
let poolWarningThreshold = 15 // Warn when approaching max connections

// Periodic health check for pool status
setInterval(() => {
  try {
    // Access the underlying pool through connectionManager
    const connectionManager = sequelize.connectionManager
    if (!connectionManager || !connectionManager.pool) {
      return // Pool not yet initialized
    }

    const pool = connectionManager.pool
    const poolInfo = {
      total: pool._count || 0,
      available: pool._availableObjects?.length || 0,
      pending: pool._pendingQueue?.length || 0,
      max: pool._max || sequelize.options.pool?.max,
      min: pool._min || sequelize.options.pool?.min
    }

    // Warn if pool is nearly exhausted
    if (poolInfo.total >= poolWarningThreshold && poolInfo.available === 0) {
      console.warn('⚠️  Database pool exhaustion risk!', poolInfo)
      console.warn('   Consider increasing pool.max or optimizing queries')
    }

    // Warn if many connections are waiting
    if (poolInfo.pending > 10) {
      console.warn('⚠️  High number of pending database requests!', poolInfo)
      console.warn('   Database may be under heavy load')
    }

    // Log pool status periodically in development
    if (process.env.NODE_ENV !== 'production' && (poolInfo.total > 5 || poolInfo.pending > 0)) {
      console.log('📊 DB Pool Status:', poolInfo)
    }
  } catch (error) {
    // Silently fail if pool structure changes in future Sequelize versions
    console.debug('Could not read pool stats:', error.message)
  }
}, 30000) // Check every 30 seconds

// Log initial pool configuration
console.log('💾 Database pool initialized:', {
  environment: env,
  maxConnections: sequelize.options.pool?.max || 'unknown',
  minConnections: sequelize.options.pool?.min || 'unknown'
})

export { sequelize, config }
export default sequelize