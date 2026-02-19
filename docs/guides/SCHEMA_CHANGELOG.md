# Database Schema Changelog

## 2026-02-13: Messaging & Subscription Enhancements

### New Tables
- `conversations` - Admin-business messaging threads
- `messages` - Individual messages within conversations
- `message_templates` - Reusable message templates
- `notification_logs` - Comprehensive notification tracking (created if missing)

### New Columns
**businesses**:
- `notification_preferences` (JSONB) - Email notification settings
- `menu_display_mode` (VARCHAR) - Grid/list display preference
- `menu_pdf_url`, `menu_pdf_filename`, `menu_pdf_uploaded_at` - PDF menu support
- `facebook_url`, `instagram_url`, `twitter_url`, `snapchat_url` - Social media links
- `menu_phone` (VARCHAR) - Menu inquiry phone number

**platform_admins**:
- `notification_preferences` (JSONB) - Admin notification settings

**branches**:
- `scanner_access_enabled` (BOOLEAN) - QR scanner access control
- `pos_access_enabled` (BOOLEAN) - POS terminal access control

**products**:
- `image_original_url`, `image_large_url`, `image_thumbnail_url` - Multi-resolution images
- `image_filename`, `image_uploaded_at`, `image_file_size` - Image metadata

**messages**:
- `email_notification_sent`, `email_notification_sent_at`, `email_notification_status`, `unsubscribe_token` - Email tracking

### ENUM Additions
**enum_subscriptions_plan_type** (irreversible):
- `loyalty_starter`, `loyalty_growth`, `loyalty_professional`
- `pos_business`, `pos_enterprise`, `pos_premium`

**enum_businesses_current_plan** (irreversible):
- Same 6 values as above

**enum_notification_logs_status** (irreversible):
- `complained` (spam complaint tracking)

### Indexes Added
- `idx_products_image_uploaded_at` on products(image_uploaded_at)
- `idx_conversations_business_id`, `idx_conversations_admin_id`, `idx_conversations_status`, `idx_conversations_last_message_at`
- `idx_messages_conversation_id`, `idx_messages_sender_id`, `idx_messages_recipient_id`, `idx_messages_status`, `idx_messages_created_at`

### Deprecated Fields
- `conversations.unread_count_business` - Reset to 0, businesses receive emails instead
