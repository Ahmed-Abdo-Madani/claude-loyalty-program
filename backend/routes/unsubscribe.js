import express from 'express'
import MessageUnsubscribeController from '../controllers/messageUnsubscribeController.js'

const router = express.Router()

// Unsubscribe from message notifications
router.get('/messages/:token', MessageUnsubscribeController.unsubscribe)

export default router
