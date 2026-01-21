
import express from 'express';
import { generateCheckout, handleWebhook, getSubscriptionDetails, cancelSubscription, getPortalUrl } from '../controllers/SubscriptionController.js';
import { requireBusinessAuth } from '../middleware/hybridBusinessAuth.js';

const router = express.Router();

// Public webhook route (signature verification handled in controller)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Authenticated routes
router.post('/checkout', requireBusinessAuth, generateCheckout);
router.get('/details', requireBusinessAuth, getSubscriptionDetails);
router.post('/portal', requireBusinessAuth, getPortalUrl);
router.post('/cancel', requireBusinessAuth, cancelSubscription);

export default router;
