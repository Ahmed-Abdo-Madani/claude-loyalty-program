import winston from 'winston'

const isDevelopment = process.env.NODE_ENV !== 'production'

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`

    if (stack) {
      log += `\n${stack}`
    }

    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`
    }

    return log
  })
)

const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'warn',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ]
})

// Add file logging in production
if (!isDevelopment) {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.json()
  }))

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.json()
  }))
}

export default logger