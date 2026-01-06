import express from 'express'
import logger from '../config/logger.js'

const router = express.Router()

// POST /api/contact
router.post('/', async (req, res) => {
    try {
        const { firstName, lastName, email, company, subject, message } = req.body

        // In a real application, you would send an email here using a service like SendGrid, AWS SES, etc.
        // For now, we will log the message content.
        logger.info('📩 New Contact Form Submission', {
            firstName,
            lastName,
            email,
            company,
            subject,
            messageLength: message?.length
        })

        // Simulate functionality
        res.status(200).json({
            success: true,
            message: 'Message received successfully'
        })

    } catch (error) {
        logger.error('Error handling contact form submission:', error)
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
})

export default router
