import express from 'express';
import { AutoEngagementConfig } from '../models/index.js';
import AutoEngagementService from '../services/AutoEngagementService.js';
import { requireBusinessAuth } from '../middleware/hybridBusinessAuth.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * POST /api/auto-engagement/config
 * Create or update auto-engagement configuration for a business
 */
router.post('/config', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.businessId; // From requireBusinessAuth middleware
    const {
      enabled,
      inactivity_days,
      message_template,
      channels
    } = req.body;

    // Validate configuration
    const validation = AutoEngagementService.validateConfig(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid configuration',
        errors: validation.errors
      });
    }

    // Check if config already exists
    let config = await AutoEngagementConfig.findOne({
      where: { business_id: businessId }
    });

    if (config) {
      // Update existing config
      await config.update({
        enabled: enabled !== undefined ? enabled : config.enabled,
        inactivity_days: inactivity_days || config.inactivity_days,
        message_template: message_template || config.message_template,
        channels: channels || config.channels
      });

      logger.info(`Updated auto-engagement config for business ${businessId}`);
    } else {
      // Create new config
      config = await AutoEngagementConfig.create({
        business_id: businessId,
        enabled: enabled !== undefined ? enabled : false,
        inactivity_days: inactivity_days || 7,
        message_template: message_template || {
          header: "We miss you!",
          body: "Come back and earn rewards with us!"
        },
        channels: channels || ['wallet']
      });

      logger.info(`Created auto-engagement config for business ${businessId}`);
    }

    res.status(200).json({
      success: true,
      message: config ? 'Configuration updated successfully' : 'Configuration created successfully',
      data: {
        config_id: config.config_id,
        business_id: config.business_id,
        enabled: config.enabled,
        inactivity_days: config.inactivity_days,
        message_template: config.message_template,
        channels: config.channels,
        last_run_at: config.last_run_at,
        last_run_status: config.last_run_status,
        total_customers_notified: config.total_customers_notified
      }
    });

  } catch (error) {
    logger.error('Error creating/updating auto-engagement config', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to save configuration',
      error: error.message
    });
  }
});

/**
 * GET /api/auto-engagement/config
 * Get auto-engagement configuration for the authenticated business
 */
router.get('/config', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.businessId;

    const config = await AutoEngagementConfig.findOne({
      where: { business_id: businessId }
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No auto-engagement configuration found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        config_id: config.config_id,
        business_id: config.business_id,
        enabled: config.enabled,
        inactivity_days: config.inactivity_days,
        message_template: config.message_template,
        channels: config.channels,
        last_run_at: config.last_run_at,
        last_run_status: config.last_run_status,
        last_run_error: config.last_run_error,
        total_customers_notified: config.total_customers_notified,
        created_at: config.created_at,
        updated_at: config.updated_at
      }
    });

  } catch (error) {
    logger.error('Error fetching auto-engagement config', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch configuration',
      error: error.message
    });
  }
});

/**
 * GET /api/auto-engagement/history
 * Get auto-engagement notification history for the authenticated business
 */
router.get('/history', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.businessId;
    const {
      page = 1,
      limit = 50,
      date_from,
      date_to
    } = req.query;

    const history = await AutoEngagementService.getAutoEngagementHistory(businessId, {
      page: parseInt(page),
      limit: parseInt(limit),
      date_from,
      date_to
    });

    res.status(200).json({
      success: true,
      data: history
    });

  } catch (error) {
    logger.error('Error fetching auto-engagement history', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch history',
      error: error.message
    });
  }
});

/**
 * DELETE /api/auto-engagement/config
 * Disable auto-engagement configuration for the authenticated business
 */
router.delete('/config', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.businessId;

    const config = await AutoEngagementConfig.findOne({
      where: { business_id: businessId }
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No auto-engagement configuration found'
      });
    }

    // Disable instead of hard delete
    config.enabled = false;
    await config.save();

    logger.info(`Disabled auto-engagement config for business ${businessId}`);

    res.status(200).json({
      success: true,
      message: 'Auto-engagement disabled successfully',
      data: {
        config_id: config.config_id,
        business_id: config.business_id,
        enabled: config.enabled,
        inactivity_days: config.inactivity_days,
        message_template: config.message_template,
        channels: config.channels,
        last_run_at: config.last_run_at,
        last_run_status: config.last_run_status,
        total_customers_notified: config.total_customers_notified
      }
    });

  } catch (error) {
    logger.error('Error disabling auto-engagement config', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to disable configuration',
      error: error.message
    });
  }
});

export default router;
