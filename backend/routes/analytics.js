import express from 'express'
import AnalyticsController from '../controllers/analyticsController.js'

const router = express.Router()

router.post('/page-view', AnalyticsController.recordPageView)

export default router
