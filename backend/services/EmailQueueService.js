import EmailService from './EmailService.js'
import logger from '../config/logger.js'
import NotificationLog from '../models/NotificationLog.js'

class EmailQueueService {
    static queue = []
    static processing = false
    static batchSize = 10
    static batchDelay = 1000 // 1 second

    /**
     * Add email to queue for processing
     * @param {Object} emailData - Email data to send
     * @returns {Object} Queue status
     */
    static async enqueue(emailData) {
        // Basic validation
        if (!emailData || !emailData.to || !emailData.subject) {
            throw new Error('Invalid email data for queue')
        }

        const queueItem = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            data: emailData,
            addedAt: new Date()
        }

        this.queue.push(queueItem)

        logger.debug(`Email added to queue. Queue size: ${this.queue.length}`)

        // Start processing if not running
        if (!this.processing) {
            this.processQueue()
        }

        return {
            success: true,
            queued: true,
            id: queueItem.id,
            position: this.queue.length,
            estimatedDelay: Math.ceil(this.queue.length / this.batchSize) * this.batchDelay
        }
    }

    /**
     * Process the email queue
     */
    static async processQueue() {
        if (this.processing || this.queue.length === 0) return

        this.processing = true
        logger.info(`Starting email queue processing. ${this.queue.length} items pending.`)

        try {
            while (this.queue.length > 0) {
                // Take a batch
                const batch = this.queue.splice(0, this.batchSize)

                logger.debug(`Processing email batch of ${batch.length} items`)

                // Process batch in parallel
                const results = await Promise.allSettled(batch.map(async (item) => {
                    const logId = item.data.logId
                    try {
                        const result = await EmailService.sendTransactional(item.data)

                        // Update NotificationLog if logId is provided
                        if (logId) {
                            const logEntry = await NotificationLog.findByPk(logId)
                            if (logEntry) {
                                await logEntry.markAsSent(result.externalId, result.provider)
                            }
                        }
                        return result
                    } catch (error) {
                        logger.error('Failed to process queued email', {
                            to: item.data.to,
                            logId,
                            error: error.message
                        })

                        // Update NotificationLog failure if logId is provided
                        if (logId) {
                            try {
                                const logEntry = await NotificationLog.findByPk(logId)
                                if (logEntry) {
                                    const errorContext = {
                                        provider_error: error.message,
                                        code: error.code,
                                        is_retryable: error.isRetryable,
                                        attempts: error.attempts,
                                        queued_at: item.addedAt
                                    }
                                    await logEntry.markAsFailed(error.message, error.code, errorContext)
                                }
                            } catch (logError) {
                                logger.error('Failed to update NotificationLog from queue', { logId, error: logError.message })
                            }
                        }
                        throw error
                    }
                }))

                // Delay before next batch to respect rate limits
                if (this.queue.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, this.batchDelay))
                }
            }
        } catch (error) {
            logger.error('Fatal error in email queue processing', { error: error.message })
        } finally {
            this.processing = false
            logger.info('Email queue processing completed or paused')
        }
    }

    /**
     * Get queue statistics
     */
    static getQueueStats() {
        return {
            size: this.queue.length,
            processing: this.processing,
            batchSize: this.batchSize
        }
    }
}

export default EmailQueueService
