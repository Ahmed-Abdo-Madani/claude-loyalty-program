## 2026-02-13: No-Drop Migration Deployment

### Summary
Successfully deployed 14 migrations from dev branch without dropping production database.

### Migrations Applied
1. 20260126-add-pos-access-enabled-to-branches.js
2. 20260130-add-new-subscription-plan-types.js (ENUM - irreversible)
3. 20260131-add-menu-display-and-image-fields.js
4. 20260202-add-social-media-links.js
5. 20260203-add-menu-phone.js
6. 20260205-add-complained-to-notification-logs-status.js (ENUM - irreversible)
7. 20260207-create-conversations-table.js
8. 20260207-create-message-templates-table.js
9. 20260207-create-messages-table.js
10. 20260208-add-notification-preferences.js
11. 20260208-add-scanner-access-enabled.js
12. 20260209-add-missing-notification-columns.js
13. 20260211-cleanup-business-unread-counts.js
14. 20250208_add_notification_tracking_to_messages.js

### Data Impact
- **Preserved**: All wallet passes, customers, businesses, offers
- **Added**: Messaging infrastructure (conversations, messages, templates)
- **Modified**: ENUM types (subscription plans, notification statuses)
- **Reset**: conversations.unread_count_business to 0 (deprecated field)

### Rollback Status
- **Reversible**: Table/column additions (see rollback script)
- **Irreversible**: ENUM value additions (keep new values)

### Verification Results
- ✅ All 14 migrations applied successfully
- ✅ Server startup validations passed
- ✅ Existing wallet passes generate correctly
- ✅ New messaging endpoints operational
- ✅ No increase in error rate

### Deployment Time
- Start: 2026-02-13 10:30:00 UTC
- End: 2026-02-13 10:35:00 UTC
- Duration: 5 minutes
- Downtime: 0 seconds (zero-downtime deployment)
