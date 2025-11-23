# Moyasar Webhook Integration Guide

## Overview

Webhooks provide real-time payment notifications from Moyasar, enabling instant subscription activation and immediate failure handling. Unlike polling or scheduled cron jobs, webhooks notify your backend the moment a payment event occurs, ensuring the best user experience.

### Why Webhooks?

- **Instant Activation**: Subscriptions are activated immediately after payment (vs. waiting for cron job)
- **Real-Time Failure Handling**: Payment failures trigger retry logic instantly
- **Reduced Server Load**: No need to poll Moyasar API for payment status
- **Better User Experience**: Users see subscription activated without delays
- **Audit Trail**: All webhook events are logged in `webhook_logs` table for debugging

### Webhook vs Cron Job

| Feature | Webhook | Cron Job |
|---------|---------|----------|
| **Timing** | Real-time (immediate) | Scheduled (daily at 2:00 AM UTC) |
| **Use Case** | User-initiated payments | Recurring subscription renewals |
| **Activation Speed** | Instant | Up to 24 hours delay |
| **Retry Logic** | Handled by Moyasar | Handled by application |
| **Network Dependency** | Requires public endpoint | No external dependencies |

**Both work together**: Webhooks handle immediate user payments, while the cron job ensures recurring billing happens on schedule.

---

## Prerequisites

Before setting up webhooks, ensure you have:

- ✅ Moyasar account with API access
- ✅ `MOYASAR_SECRET_KEY` configured in `.env`
- ✅ Publicly accessible webhook endpoint
- ✅ Database migration for `webhook_logs` table applied
- ✅ Backend server running and accessible from internet

---

## Webhook URL Configuration

### Development Environment

For local development, you need to expose your local server to the internet using a tunneling service like ngrok.

#### Option 1: ngrok (Recommended)

1. **Install ngrok**:
   ```bash
   # Windows (using chocolatey)
   choco install ngrok
   
   # macOS (using homebrew)
   brew install ngrok/ngrok/ngrok
   
   # Or download from: https://ngrok.com/download
   ```

2. **Start ngrok tunnel**:
   ```bash
   ngrok http 3001
   ```

3. **Copy the HTTPS URL** from ngrok output:
   ```
   Forwarding  https://abc123.ngrok.io -> http://localhost:3001
   ```

4. **Update `.env`**:
   ```bash
   MOYASAR_WEBHOOK_URL=https://abc123.ngrok.io/api/webhooks/moyasar
   ```

**Note**: ngrok URLs change on each restart. For persistent URLs, upgrade to ngrok paid plan.

#### Option 2: localtunnel

```bash
npm install -g localtunnel
lt --port 3001
```

#### Option 3: VS Code Port Forwarding

If using VS Code Remote Development:
1. Open Ports panel (Ctrl+Shift+P → "Forward a Port")
2. Forward port 3001
3. Set visibility to "Public"
4. Use the forwarded URL

### Production Environment

In production, use your API domain:

```bash
MOYASAR_WEBHOOK_URL=https://api.madna.me/api/webhooks/moyasar
```

**Requirements**:
- URL must be publicly accessible (not behind VPN or firewall)
- SSL/TLS certificate must be valid (HTTPS required)
- Port 443 must be open for HTTPS traffic
- No IP whitelisting (Moyasar uses dynamic IPs)

---

## Moyasar Dashboard Setup

### Step-by-Step Instructions

#### 1. Log in to Moyasar Dashboard

Navigate to: [https://dashboard.moyasar.com](https://dashboard.moyasar.com)

#### 2. Navigate to Webhooks Settings

- Click **Settings** in the left sidebar
- Click **Webhooks** tab

#### 3. Add Webhook Endpoint

Click **"Add Webhook Endpoint"** button

#### 4. Configure Webhook URL

Enter your webhook URL:
- **Development**: `https://abc123.ngrok.io/api/webhooks/moyasar`
- **Production**: `https://api.madna.me/api/webhooks/moyasar`

#### 5. Select Webhook Events

Enable the following events:

| Event | Required | Description |
|-------|----------|-------------|
| ✅ **payment.paid** | **REQUIRED** | Payment successfully completed - activates subscription immediately |
| ✅ **payment.failed** | **REQUIRED** | Payment declined or failed - triggers retry logic with grace period |
| ✅ **payment.refunded** | **REQUIRED** | Payment refunded (full or partial) - cancels subscription if full refund |
| ⚠️ payment.authorized | Optional | Payment pre-authorized but not captured (for two-step payments) |
| ⚠️ payment.captured | Optional | Payment captured after authorization (alternative to payment.paid) |

**Critical Events**: `payment.paid`, `payment.failed`, and `payment.refunded` are required for proper subscription management.

#### 6. Copy Webhook Secret

After saving, Moyasar will generate a webhook secret (starts with `whsec_`).

**Example**: `whsec_1234567890abcdef1234567890abcdef`

#### 7. Update Environment Variables

Add the webhook secret to your `.env` file:

```bash
MOYASAR_WEBHOOK_SECRET=whsec_1234567890abcdef1234567890abcdef
```

**Security**: Keep this secret confidential. Never commit it to version control.

#### 8. Save Webhook Configuration

Click **"Save"** to activate the webhook endpoint.

#### 9. Test Webhook Delivery

Use Moyasar's built-in test feature:
1. Click **"Test"** next to your webhook endpoint
2. Select event type (e.g., `payment.paid`)
3. Click **"Send Test Webhook"**
4. Check backend logs for webhook receipt

---

## Webhook Flow Diagram

```
┌──────────┐      ┌──────────┐      ┌──────────────────┐
│   User   │─────►│ Moyasar  │─────►│ Webhook Endpoint │
│          │      │ Checkout │      │ /api/webhooks/   │
│          │      │          │      │ moyasar          │
└──────────┘      └──────────┘      └──────────────────┘
                        │                      │
                        │                      ▼
                        │            ┌──────────────────┐
                        │            │ 1. Verify HMAC   │
                        │            │    Signature     │
                        │            └──────────────────┘
                        │                      │
                        │                      ▼
                        │            ┌──────────────────┐
                        │            │ 2. Idempotency   │
                        │            │    Check         │
                        │            └──────────────────┘
                        │                      │
                        │                      ▼
                        │            ┌──────────────────┐
                        │            │ 3. Create        │
                        │            │    WebhookLog    │
                        │            └──────────────────┘
                        │                      │
                        │                      ▼
                        │            ┌──────────────────┐
                        │            │ 4. Find Payment  │
                        │            │    Record        │
                        │            └──────────────────┘
                        │                      │
                        │                      ▼
                        │            ┌──────────────────┐
                        │            │ 5. Process Event │
                        │            │    (paid/failed/ │
                        │            │    refunded)     │
                        │            └──────────────────┘
                        │                      │
                        │                      ▼
                        │            ┌──────────────────┐
                        │            │ 6. Update        │
                        │            │    Subscription  │
                        │            └──────────────────┘
                        │                      │
                        │                      ▼
                        │            ┌──────────────────┐
                        └────────────┤ 7. Return 200 OK │
                                     └──────────────────┘
```

---

## Webhook Event Types

### payment.paid

**Triggered when**: Payment is successfully completed

**Actions**:
1. Mark payment as `paid` in database
2. Find associated subscription
3. Update subscription status to `active`
4. Set `billing_cycle_start` to current date
5. Calculate `next_billing_date` (30 days from now)
6. Reset `retry_count` to 0
7. Clear `grace_period_end`
8. Update business `subscription_status` to `active`
9. Generate invoice with `status='paid'`

**Response**: `200 OK` with `{ received: true, processed: true }`

**Example Payload**:
```json
{
  "id": "evt_12345",
  "type": "payment.paid",
  "data": {
    "id": "pay_67890",
    "status": "paid",
    "amount": 21000,
    "currency": "SAR",
    "source": {
      "type": "creditcard",
      "message": "Visa ending in 4242"
    }
  }
}
```

### payment.failed

**Triggered when**: Payment is declined or fails

**Actions**:
1. Mark payment as `failed` with failure reason
2. Find associated subscription
3. Increment `retry_count`
4. **If `retry_count < 3`**:
   - Update subscription status to `past_due`
   - Set `grace_period_end` to 3 days from now
   - Log retry scheduled
5. **If `retry_count >= 3`**:
   - Update subscription status to `expired`
   - Update business `subscription_status` to `expired`
   - Log account suspension

**Response**: `200 OK` with `{ received: true, processed: true }`

**Example Payload**:
```json
{
  "id": "evt_12346",
  "type": "payment.failed",
  "data": {
    "id": "pay_67891",
    "status": "failed",
    "message": "Insufficient funds",
    "error": {
      "type": "card_error",
      "message": "Your card has insufficient funds."
    }
  }
}
```

### payment.refunded

**Triggered when**: Payment is refunded (full or partial)

**Actions**:
1. Extract refund amount from webhook payload
2. Call `payment.processRefund(refundAmount)` to update payment status
3. Find associated subscription
4. **If full refund AND subscription is active**:
   - Update subscription status to `cancelled`
   - Set `cancelled_at` to current timestamp
   - Set `cancellation_reason` to `'refunded'`
   - Update business `subscription_status` to `cancelled`
5. **If partial refund**:
   - Log partial refund (no status change)

**Response**: `200 OK` with `{ received: true, processed: true }`

**Example Payload**:
```json
{
  "id": "evt_12347",
  "type": "payment.refunded",
  "data": {
    "id": "pay_67890",
    "status": "refunded",
    "refunded_amount": 21000,
    "refund_reason": "Customer request"
  }
}
```

### payment.authorized (Optional)

**Triggered when**: Payment is pre-authorized but not yet captured

**Actions**:
1. Update payment metadata with authorization info
2. No subscription status change (wait for capture)

**Use Case**: Two-step payment flow (authorize first, capture later)

### payment.captured (Optional)

**Triggered when**: Payment is captured after authorization

**Actions**: Same as `payment.paid` (activate subscription)

---

## Testing Webhooks

### Method 1: Moyasar Dashboard Test Feature

1. Navigate to **Settings → Webhooks**
2. Click **"Test"** next to your webhook endpoint
3. Select event type (e.g., `payment.paid`)
4. Click **"Send Test Webhook"**
5. Check backend logs for webhook receipt

**Expected Logs**:
```
📥 Moyasar webhook received { eventId: 'evt_test_123', eventType: 'payment.paid' }
✅ Webhook signature verified
✅ Webhook log created { logId: 'whl_abc123' }
✅ Payment record found { paymentId: 'pay_xyz', subscriptionId: 'sub_123' }
✅ Subscription activated { subscriptionId: 'sub_123' }
✅ Webhook processed successfully
```

### Method 2: Test Cards (Real Payment Flow)

Use Moyasar test cards to trigger real webhook events:

#### Success Card (Visa)
```
Card Number: 4111111111111111
Expiry: 12/25
CVC: 123
Name: Test User
```

**Expected**: `payment.paid` webhook received → subscription activated

#### Failure Card (Visa Declined)
```
Card Number: 4000000000000002
Expiry: 12/25
CVC: 123
Name: Test User
```

**Expected**: `payment.failed` webhook received → retry logic triggered

#### Mada Success Card
```
Card Number: 4201320111111010
Expiry: 12/25
CVC: 123
Name: Test User
```

**Expected**: `payment.paid` webhook received → subscription activated

### Method 3: Manual curl Testing

```bash
# Generate HMAC signature (use your MOYASAR_WEBHOOK_SECRET)
WEBHOOK_SECRET="whsec_your_secret_here"
PAYLOAD='{"id":"evt_test_123","type":"payment.paid","data":{"id":"pay_test_456","status":"paid","amount":21000}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | awk '{print $2}')

# Send webhook request
curl -X POST https://api.madna.me/api/webhooks/moyasar \
  -H "Content-Type: application/json" \
  -H "x-moyasar-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

**Expected Response**:
```json
{
  "received": true,
  "processed": true,
  "message": "Webhook processed"
}
```

### Verifying Webhook Processing

#### Check WebhookLog Table

```sql
SELECT 
  public_id,
  webhook_event_id,
  event_type,
  status,
  signature_verified,
  processed_at,
  processing_error,
  created_at
FROM webhook_logs
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Status**: `processed` (or `duplicate` for repeated events)

#### Check Payment Status

```sql
SELECT 
  public_id,
  moyasar_payment_id,
  status,
  payment_date,
  retry_count
FROM payments
WHERE moyasar_payment_id = 'pay_67890';
```

**Expected Status**: `paid` (for successful payment webhook)

#### Check Subscription Status

```sql
SELECT 
  public_id,
  business_id,
  status,
  billing_cycle_start,
  next_billing_date,
  grace_period_end
FROM subscriptions
WHERE public_id = 'sub_123';
```

**Expected Status**: `active` (for successful payment webhook)

---

## Monitoring and Debugging

### Webhook Logs Table

The `webhook_logs` table tracks all webhook events:

```sql
-- Get recent webhook logs
SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 20;

-- Get failed webhooks
SELECT * FROM webhook_logs WHERE status = 'failed';

-- Get webhooks for specific payment
SELECT * FROM webhook_logs WHERE moyasar_payment_id = 'pay_67890';

-- Get signature verification failures
SELECT * FROM webhook_logs WHERE signature_verified = false;
```

### Backend Logs

Search for "Moyasar webhook" in application logs:

```bash
# Docker/production
docker logs loyalty-backend | grep "webhook"

# Local development
npm run backend:dev
# Look for webhook-related log entries
```

### Moyasar Dashboard Logs

1. Navigate to **Settings → Webhooks**
2. Click **"View Logs"** next to your webhook endpoint
3. Review delivery attempts and response codes

**Successful Delivery**: `200 OK` response
**Failed Delivery**: `4xx` or `5xx` response (Moyasar will retry)

---

## Troubleshooting

### Issue: Webhook Signature Verification Failed

**Symptoms**:
- `401 Unauthorized` response
- Log: `⚠️ Webhook signature verification failed`

**Causes**:
1. `MOYASAR_WEBHOOK_SECRET` mismatch with Moyasar dashboard
2. Raw request body not preserved (middleware issue)
3. Signature header missing or malformed

**Solutions**:
1. **Verify webhook secret**:
   - Check `.env` file: `MOYASAR_WEBHOOK_SECRET=whsec_...`
   - Compare with Moyasar dashboard secret
   - Ensure no extra spaces or line breaks

2. **Check middleware configuration**:
   - Ensure `express.raw()` middleware is registered for `/api/webhooks` path
   - Verify it's registered BEFORE `express.json()` middleware
   - Check `server.js` line ~159:
     ```javascript
     app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '1mb' }))
     ```

3. **Test signature manually**:
   ```bash
   # Generate expected signature
   echo -n '{"id":"evt_123","type":"payment.paid"}' | \
     openssl dgst -sha256 -hmac "whsec_your_secret" -hex
   ```

### Issue: Webhook Not Received

**Symptoms**:
- No webhook logs in backend
- No entries in `webhook_logs` table
- Moyasar dashboard shows delivery failures

**Causes**:
1. Webhook URL not publicly accessible
2. Firewall blocking Moyasar IPs
3. Webhook not configured in Moyasar dashboard
4. ngrok tunnel expired (development)

**Solutions**:
1. **Test webhook URL accessibility**:
   ```bash
   # From external server or online tool
   curl -X POST https://api.madna.me/api/webhooks/moyasar \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

2. **Check firewall/security groups**:
   - Ensure port 443 (HTTPS) is open
   - No IP whitelisting (Moyasar uses dynamic IPs)
   - Check cloud provider security groups (AWS, Render, etc.)

3. **Verify webhook configuration**:
   - Log in to Moyasar dashboard
   - Navigate to Settings → Webhooks
   - Check webhook URL is correct
   - Ensure events are enabled

4. **Restart ngrok tunnel** (development):
   ```bash
   ngrok http 3001
   # Update MOYASAR_WEBHOOK_URL in Moyasar dashboard
   ```

### Issue: Duplicate Webhook Processing

**Symptoms**:
- Multiple `webhook_logs` entries with same `webhook_event_id`
- Subscription activated multiple times
- Duplicate invoices

**Causes**:
1. Idempotency check not working
2. Database transaction issues
3. Moyasar retry after timeout

**Solutions**:
1. **Check idempotency logic**:
   - Verify `webhook_event_id` uniqueness constraint in database
   - Check webhook handler calls `WebhookLog.findByEventId()`
   - Ensure duplicate status is returned correctly

2. **Review webhook logs**:
   ```sql
   SELECT webhook_event_id, COUNT(*) as count
   FROM webhook_logs
   GROUP BY webhook_event_id
   HAVING COUNT(*) > 1;
   ```

3. **Ensure fast response**:
   - Webhook handler should return `200 OK` within 5 seconds
   - Long processing times cause Moyasar to retry
   - Consider async processing for heavy operations

### Issue: Payment Not Found in Webhook Handler

**Symptoms**:
- Log: `⚠️ Payment record not found`
- Webhook marked as `failed` with error "Payment not found in database"

**Causes**:
1. Payment record not created during checkout
2. `moyasar_payment_id` mismatch
3. Webhook received before payment record created (race condition)

**Solutions**:
1. **Verify payment creation during checkout**:
   - Check payment is created BEFORE redirecting to Moyasar
   - Ensure `moyasar_payment_id` is stored correctly
   - Review checkout flow logs

2. **Check payment record**:
   ```sql
   SELECT * FROM payments WHERE moyasar_payment_id = 'pay_67890';
   ```

3. **Add retry logic** (if race condition):
   - Implement exponential backoff in webhook handler
   - Retry payment lookup after 1s, 2s, 4s
   - Mark as failed only after max retries

### Issue: Subscription Not Activated After Payment

**Symptoms**:
- Payment marked as `paid`
- Subscription status still `trial` or `past_due`
- Business subscription status not updated

**Causes**:
1. Webhook processing failed
2. Subscription not found
3. Database transaction rolled back
4. Error in `SubscriptionService.activateSubscriptionFromPayment()`

**Solutions**:
1. **Check webhook logs**:
   ```sql
   SELECT * FROM webhook_logs 
   WHERE moyasar_payment_id = 'pay_67890'
   AND status = 'failed';
   ```

2. **Review backend error logs**:
   ```bash
   docker logs loyalty-backend | grep "Failed to activate subscription"
   ```

3. **Manually activate subscription** (emergency fix):
   ```sql
   BEGIN;
   
   UPDATE subscriptions
   SET status = 'active',
       billing_cycle_start = NOW(),
       next_billing_date = NOW() + INTERVAL '30 days'
   WHERE public_id = 'sub_123';
   
   UPDATE businesses
   SET subscription_status = 'active'
   WHERE public_id = 'biz_456';
   
   COMMIT;
   ```

4. **Check subscription_id in payment**:
   ```sql
   SELECT public_id, subscription_id, moyasar_payment_id, status
   FROM payments
   WHERE moyasar_payment_id = 'pay_67890';
   ```

---

## Security Considerations

### Signature Verification

- **All webhooks must pass HMAC-SHA256 signature verification**
- Uses `crypto.timingSafeEqual()` to prevent timing attacks
- Rejects webhooks with invalid signatures (401 Unauthorized)
- Logs signature verification failures for security monitoring

### Rate Limiting

- Webhook endpoint is subject to server-wide rate limiting
- Default limit: 100 requests per 15 minutes (production)
- Moyasar retries failed webhooks with exponential backoff
- Monitor rate limit violations in logs

### Idempotency

- Webhook event IDs are unique and used for idempotency
- Duplicate webhooks return `200 OK` without reprocessing
- Prevents double-charging and duplicate invoices
- Monitor `webhook_logs` table for duplicate entries

### Data Validation

- Validates webhook payload structure before processing
- Verifies payment amounts match expected values
- Checks currency matches subscription currency
- Sanitizes and validates all input data

### Secret Management

- `MOYASAR_WEBHOOK_SECRET` must be kept confidential
- Never commit webhook secret to version control
- Rotate webhook secret periodically for security
- Update environment variables when rotating

---

## Best Practices

1. **Always Return 200 OK**
   - Moyasar expects `200 OK` for successful webhook receipt
   - Return 200 even if processing fails internally
   - Prevents infinite retries for unrecoverable errors

2. **Log Everything**
   - Comprehensive logging helps debug webhook issues
   - Log signature verification results
   - Log idempotency checks
   - Log processing results (success/failure)

3. **Monitor Webhook Logs**
   - Regularly review `webhook_logs` table for failures
   - Set up alerts for `status='failed'` entries
   - Monitor signature verification failures

4. **Test Thoroughly**
   - Test all webhook event types before production
   - Use Moyasar test cards to trigger real webhooks
   - Verify subscription status after each test

5. **Handle Retries**
   - Moyasar retries failed webhooks with exponential backoff
   - Ensure idempotency to handle retries safely
   - Don't process duplicate events

6. **Secure Webhook Secret**
   - Treat webhook secret like a password
   - Rotate periodically for security
   - Monitor for unauthorized access attempts

7. **Use Transactions**
   - Wrap database updates in transactions for atomicity
   - Rollback on errors to maintain consistency
   - Ensure subscription and payment updates are atomic

8. **Graceful Degradation**
   - If webhook processing fails, cron job will catch up
   - Webhooks are for instant updates, cron is the safety net
   - Don't rely solely on webhooks for critical operations

---

## Integration with Recurring Billing

### Webhook vs Cron Job Responsibilities

**Webhooks Handle**:
- ✅ User-initiated payments (upgrades, plan changes)
- ✅ Instant subscription activation
- ✅ Real-time payment failure notifications
- ✅ Refund processing

**Cron Job Handles**:
- ✅ Scheduled subscription renewals (daily at 2:00 AM UTC)
- ✅ Retry failed payments (up to 3 attempts)
- ✅ Grace period management (3 days after max retries)
- ✅ Account suspension for non-payment

### Complementary Workflows

1. **User upgrades subscription**:
   - User completes payment on Moyasar checkout
   - **Webhook** receives `payment.paid` event
   - **Webhook** activates subscription immediately
   - User sees active subscription without delay

2. **Monthly renewal**:
   - **Cron job** runs at 2:00 AM UTC
   - **Cron job** charges stored payment method via Moyasar API
   - **Webhook** receives `payment.paid` or `payment.failed` event
   - **Webhook** updates subscription status

3. **Payment fails**:
   - **Webhook** receives `payment.failed` event
   - **Webhook** increments retry count
   - **Webhook** sets grace period (3 days)
   - **Cron job** retries after 1 day (up to 3 attempts)

4. **Retry succeeds**:
   - **Webhook** receives `payment.paid` event
   - **Webhook** activates subscription
   - Grace period cleared

5. **Max retries exceeded**:
   - **Webhook** receives `payment.failed` event (3rd attempt)
   - **Webhook** marks subscription as `expired`
   - **Cron job** suspends business account after grace period

---

## References

- **Moyasar API Documentation**: [https://docs.moyasar.com/api/](https://docs.moyasar.com/api/)
- **Moyasar Webhook Documentation**: [https://docs.moyasar.com/api/webhooks](https://docs.moyasar.com/api/webhooks)
- **Backend Implementation**: `backend/routes/webhooks.js`
- **Webhook Log Model**: `backend/models/WebhookLog.js`
- **Subscription Service**: `backend/services/SubscriptionService.js`
- **Payment Model**: `backend/models/Payment.js`
- **Subscription Model**: `backend/models/Subscription.js`

---

## Support

For questions or issues:
1. Check troubleshooting section above
2. Review backend logs for detailed error messages
3. Query `webhook_logs` table for processing history
4. Check Moyasar dashboard webhook logs for delivery status
5. Contact Moyasar support for payment-specific issues

---

**Last Updated**: 2025-02-21  
**Version**: 1.0.0
