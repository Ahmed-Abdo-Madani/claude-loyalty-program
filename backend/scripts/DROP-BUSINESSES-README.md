# Drop All Businesses Script

## ⚠️ WARNING

This script **permanently deletes ALL businesses** and their related data from the database. This action is **IRREVERSIBLE** in production!

## What Gets Deleted

The script deletes data in the correct order to respect foreign key constraints:

1. **Device Registrations** - Apple Wallet device registrations
2. **Device Logs** - Apple Wallet device error logs
3. **Wallet Passes** - Apple Wallet and Google Wallet passes
4. **Customer Progress** - Stamp progress tracking
5. **Customers** - All customer records
6. **Card Designs** - Offer card design configurations
7. **Offers** - All loyalty offers
8. **Branches** - Business branch locations
9. **Devices** - Registered devices
10. **Businesses** - All business accounts

## Usage

### Option 1: Using npm script (Recommended)
```bash
cd backend
npm run drop-businesses
```

### Option 2: Direct execution
```bash
cd backend
node scripts/drop-all-businesses.js
```

## Safety Features

✅ **Shows preview** of businesses that will be deleted  
✅ **Shows counts** of all related data  
✅ **3-second countdown** before deletion starts  
✅ **Transaction-based** - all or nothing  
✅ **Can be cancelled** with Ctrl+C during countdown  

## Example Output

```
⚠️  DROP ALL BUSINESSES SCRIPT
==================================================

⚠️  WARNING: This will permanently delete:
   - All businesses
   - All offers
   - All customers
   ...

🌍 Environment: development
📁 Database: Connected

✅ Database connection established

📊 Found 2 business(es) to delete

📋 Businesses to be deleted:
   1. Test Cafe (biz_abc123)
      Owner: test@example.com
   2. Demo Store (biz_xyz789)
      Owner: demo@example.com

📊 Related data to be deleted:
   - 5 offer(s)
   - 12 customer(s)
   - 3 branch(es)
   - 24 wallet pass(es)

⏳ Starting deletion in 3 seconds...
   Press Ctrl+C to cancel

🗑️  Starting deletion process...

🗑️  Deleting device registrations...
🗑️  Deleting device logs...
🗑️  Deleting wallet passes...
🗑️  Deleting customer progress...
🗑️  Deleting customers...
🗑️  Deleting offer card designs...
🗑️  Deleting offers...
🗑️  Deleting branches...
🗑️  Deleting devices...
🗑️  Deleting businesses...

✅ All businesses and related data deleted successfully!

📊 Summary:
   - Deleted 2 business(es)
   - Deleted 5 offer(s)
   - Deleted 12 customer(s)
   - Deleted 3 branch(es)
   - Deleted 24 wallet pass(es)

✨ Database is now clean and ready for fresh data

🎉 Script completed successfully
```

## When to Use

### ✅ Good Use Cases
- **Development/Testing**: Clearing test data to start fresh
- **Local Development**: Resetting your local database
- **Staging Environment**: Preparing for new test cycle
- **Migration Testing**: Testing database migrations from clean state

### ⛔ DO NOT Use
- **Production Database**: Never run this in production unless you absolutely know what you're doing
- **Without Backup**: Always backup production data before running destructive operations
- **Shared Development DB**: Coordinate with team before running

## Production Safety

The script will work in any environment, but **think twice** before running in production:

1. **Check environment**: Script shows `NODE_ENV` before deletion
2. **Backup first**: Always have a recent backup
3. **Coordinate**: Inform team if using shared database
4. **Review output**: Carefully read the preview before allowing deletion to proceed

## Cancellation

To cancel the script:
- Press **Ctrl+C** during the 3-second countdown
- The script will exit immediately
- No data will be deleted

## Troubleshooting

### Error: "Cannot connect to database"
- Check your `.env` file has `DATABASE_URL` configured
- Verify database server is running
- Check connection credentials

### Error: "Foreign key constraint violation"
- This shouldn't happen as script deletes in correct order
- If it does, check for new tables with foreign keys to businesses
- Update script to delete those tables first

### Script hangs
- Check database connection
- Verify no long-running transactions are blocking the tables
- Try restarting database server

## Related Scripts

- `npm run init-icons` - Initialize stamp icons system
- `npm run migrate:gender` - Run gender field migration
- `npm run verify-icons` - Verify icon files exist

## Code Location

Script: `backend/scripts/drop-all-businesses.js`

## Contributing

If you add new tables with foreign keys to businesses, update this script to delete from those tables in the correct order.
