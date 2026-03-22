import { PageView } from '../models/index.js'
import logger from '../config/logger.js'

class AnalyticsController {
  static async recordPageView(req, res) {
    try {
      const { session_id, page_path, page_name, referrer_path } = req.body

      if (!session_id || typeof session_id !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Valid session_id is required'
        })
      }

      if (!page_path || typeof page_path !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Valid page_path is required'
        })
      }

      // Helper to safely cast and truncate strings to avoid DB string-truncation exceptions
      const safeString = (val, maxLen) => {
        if (val === undefined || val === null) return null
        return String(val).substring(0, maxLen)
      }

      await PageView.create({
        session_id: safeString(session_id, 100),
        page_path: safeString(page_path, 500),
        page_name: safeString(page_name, 100),
        referrer_path: safeString(referrer_path, 500),
        user_agent: safeString(req.headers['user-agent'], 500),
        visited_at: new Date()
      })

      res.status(201).json({ success: true })
    } catch (error) {
      logger.error('Record page view error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to record page view'
      })
    }
  }
}

export default AnalyticsController
