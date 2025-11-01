# Auto-Engagement System Implementation Summary

## Overview
Implemented a comprehensive auto-engagement system that automatically identifies and re-engages inactive customers via scheduled cron jobs.

## Files Created/Modified

### 1. **package.json** ✅
- Added `node-cron: ^3.0.3` dependency
- Installed successfully via npm install

### 2. **backend/utils/secureIdGenerator.js** ✅
Modified to support auto-engagement config IDs:
- Added `generateAutoEngagementConfigID()` method (format: `aec_[20chars]`)
- Updated `validateSecureID()` patterns with auto_engagement_config regex
- Updated `getIDType()` to recognize `aec_` prefix
- Updated `generateBatch()` generators object
- Exported new method in named exports

### 3. **backend/models/AutoEngagementConfig.js** ✅
Created new model with:
- **Fields:**
  - `id` (integer, primary key)
  - `config_id` (secure ID: `aec_*`)
  - `business_id` (foreign key to businesses.public_id, unique)
  - `enabled` (boolean, default: true)
  - `inactivity_days` (integer, 1-365, default: 7)
  - `message_template` (JSON: {header, body})
  - `channels` (JSON array: ['wallet', 'email', 'sms', 'push'])
  - `run_time` (string, HH:MM format, default: '09:00')
  - `timezone` (string, default: 'UTC')
  - `last_run_at` (datetime, nullable)
  - `last_run_status` (enum: 'success', 'failed', 'running')
  - `last_run_error` (text, nullable)
  - `total_customers_notified` (integer, default: 0)

- **Instance Methods:**
  - `canRun()` - Check if config can run (enabled, not running, not already ran today)
  - `markAsRunning()` - Set status to 'running'
  - `markAsCompleted(count)` - Set status to 'success', update count
  - `markAsFailed(error)` - Set status to 'failed', log error
  - `getMessageTemplate()` - Return formatted message template

- **Validations:**
  - `inactivity_days`: 1-365 range
  - `message_template`: Must have header and body strings
  - `channels`: Non-empty array with valid channels
  - `run_time`: HH:MM format validation

- **Indexes:**
  - Unique: config_id, business_id
  - Non-unique: enabled, last_run_at

### 4. **backend/models/index.js** ✅
Updated to include:
- Import AutoEngagementConfig model
- Business.hasOne(AutoEngagementConfig) relationship (CASCADE delete)
- AutoEngagementConfig.belongsTo(Business) relationship
- Export AutoEngagementConfig in both export statements

### 5. **backend/services/AutoEngagementService.js** ✅
Created service with methods:
- **`runDailyCheck()`** - Main cron job entry point
  - Fetches all enabled configs
  - Processes each business that can run
  - Returns summary stats (totalProcessed, totalNotified, totalFailed)

- **`processBusinessAutoEngagement(config)`** - Process single business
  - Marks config as running
  - Gets inactive customers
  - Sends notifications to each
  - Marks as completed/failed

- **`getInactiveCustomers(businessId, days)`** - Query inactive customers
  - Finds customers with wallet passes
  - Created before cutoff date
  - Pass not updated recently
  - Returns Customer objects with walletPasses included

- **`sendReengagementToCustomer(customer, config, template)`** - Send notification
  - Iterates through configured channels
  - Sends wallet notifications via WalletNotificationService
  - Creates NotificationLog entries with type 'auto_reengagement'
  - Handles channel-specific logic (wallet implemented, others stubbed)

- **`getAutoEngagementHistory(businessId, options)`** - Get notification history
  - Supports pagination (page, limit)
  - Date range filtering (date_from, date_to)
  - Queries NotificationLog for auto_reengagement type
  - Returns paginated results

- **`validateConfig(configData)`** - Validate configuration
  - Validates inactivity_days (1-365)
  - Validates message_template (must have header/body)
  - Validates channels (non-empty, valid channels)
  - Validates run_time (HH:MM format)
  - Returns {valid: boolean, errors: array}

### 6. **backend/routes/autoEngagement.js** ✅
Created API routes:
- **POST `/api/auto-engagement/config`** - Create/update config
  - Requires business auth
  - Validates input via AutoEngagementService.validateConfig()
  - Creates new or updates existing config
  - Returns config data

- **GET `/api/auto-engagement/config`** - Get config
  - Requires business auth
  - Returns current config for authenticated business
  - 404 if no config exists

- **GET `/api/auto-engagement/history`** - Get notification history
  - Requires business auth
  - Supports query params: page, limit, date_from, date_to
  - Returns paginated auto_reengagement notification logs

- **DELETE `/api/auto-engagement/config`** - Delete config
  - Requires business auth
  - Soft deletes config (destroys record)
  - 404 if no config exists

### 7. **backend/server.js** ✅
Updated to include:
- Import `cron` from 'node-cron'
- Import `autoEngagementRoutes`
- Import `AutoEngagementService`
- Register route: `app.use('/api/auto-engagement', autoEngagementRoutes)`
- Initialize cron job after server starts:
  - Schedule: `'0 9 * * *'` (daily at 9:00 AM UTC)
  - Calls `AutoEngagementService.runDailyCheck()`
  - Respects `DISABLE_AUTO_ENGAGEMENT` env var
  - Logs initialization and execution

### 8. **backend/.env.example** ✅
Added documentation:
```bash
# Auto-Engagement Configuration
# Set to 'true' to disable daily auto-engagement cron job
DISABLE_AUTO_ENGAGEMENT=false
```

## Database Schema

### New Table: `auto_engagement_configs`
```sql
CREATE TABLE auto_engagement_configs (
  id SERIAL PRIMARY KEY,
  config_id VARCHAR(30) UNIQUE NOT NULL,
  business_id VARCHAR(30) UNIQUE NOT NULL REFERENCES businesses(public_id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  inactivity_days INTEGER NOT NULL DEFAULT 7 CHECK (inactivity_days BETWEEN 1 AND 365),
  message_template JSON NOT NULL DEFAULT '{"header":"We miss you!","body":"Come back and earn rewards with us!"}',
  channels JSON NOT NULL DEFAULT '["wallet"]',
  run_time VARCHAR(5) NOT NULL DEFAULT '09:00' CHECK (run_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'),
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  last_run_at TIMESTAMP,
  last_run_status VARCHAR(20) CHECK (last_run_status IN ('success', 'failed', 'running')),
  last_run_error TEXT,
  total_customers_notified INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_auto_engagement_config_id ON auto_engagement_configs(config_id);
CREATE UNIQUE INDEX idx_auto_engagement_business_id ON auto_engagement_configs(business_id);
CREATE INDEX idx_auto_engagement_enabled ON auto_engagement_configs(enabled);
CREATE INDEX idx_auto_engagement_last_run ON auto_engagement_configs(last_run_at);
```

## API Endpoints

### 1. Create/Update Configuration
```http
POST /api/auto-engagement/config
Headers:
  x-session-token: <session_token>
  x-business-id: <business_id>
Body:
{
  "enabled": true,
  "inactivity_days": 7,
  "message_template": {
    "header": "We miss you!",
    "body": "Come back and earn rewards!"
  },
  "channels": ["wallet"],
  "run_time": "09:00",
  "timezone": "UTC"
}
```

### 2. Get Configuration
```http
GET /api/auto-engagement/config
Headers:
  x-session-token: <session_token>
  x-business-id: <business_id>
```

### 3. Get History
```http
GET /api/auto-engagement/history?page=1&limit=50&date_from=2025-01-01&date_to=2025-01-31
Headers:
  x-session-token: <session_token>
  x-business-id: <business_id>
```

### 4. Delete Configuration
```http
DELETE /api/auto-engagement/config
Headers:
  x-session-token: <session_token>
  x-business-id: <business_id>
```

## Cron Job Configuration

- **Schedule:** Daily at 9:00 AM UTC (`0 9 * * *`)
- **Entry Point:** `AutoEngagementService.runDailyCheck()`
- **Disable:** Set `DISABLE_AUTO_ENGAGEMENT=true` in .env
- **Logging:** All executions logged via Winston

## Workflow

1. **Cron triggers** at 9:00 AM UTC daily
2. **Fetches all enabled configs** from database
3. **For each config:**
   - Check if can run (not already ran today, not running)
   - Mark as running
   - Query inactive customers (created before cutoff, pass not updated recently)
   - For each inactive customer:
     - Send wallet notification via WalletNotificationService
     - Create NotificationLog entry with type 'auto_reengagement'
   - Mark as completed with customer count
4. **Returns summary** (totalProcessed, totalNotified, totalFailed)

## Integration Points

- **WalletNotificationService.sendReengagementNotification()** - Sends wallet push
- **NotificationLog model** - Records all notifications with type 'auto_reengagement'
- **Customer/WalletPass models** - Queries inactive customers
- **requireBusinessAuth middleware** - Secures all API routes

## Testing Checklist

- [ ] Run `npm install` in backend directory (✅ DONE)
- [ ] Start backend server (`npm run backend:dev`)
- [ ] Verify cron job initialization in logs
- [ ] Create auto-engagement config via POST endpoint
- [ ] Verify config saved in database
- [ ] Manually trigger `AutoEngagementService.runDailyCheck()` for testing
- [ ] Verify inactive customers identified correctly
- [ ] Verify wallet notifications sent
- [ ] Verify NotificationLog entries created
- [ ] Test GET config endpoint
- [ ] Test GET history endpoint with pagination
- [ ] Test DELETE config endpoint
- [ ] Test validation errors (invalid days, channels, etc.)

## Next Steps

1. **Database Migration:** Create migration SQL to add auto_engagement_configs table
2. **Frontend Integration:** Build UI for businesses to manage auto-engagement settings
3. **Email/SMS Channels:** Implement sendReengagementToCustomer for email/SMS
4. **Timezone Support:** Enhance cron to respect business timezones
5. **Analytics Dashboard:** Show auto-engagement performance metrics

## Notes

- One config per business (enforced by unique constraint on business_id)
- Cron job runs once daily and checks which configs need processing
- Each config tracks own last_run_at to prevent double-running
- Wallet channel is fully implemented; other channels are stubbed
- All notification logs have type 'auto_reengagement' for easy filtering
- System respects DISABLE_AUTO_ENGAGEMENT environment variable
