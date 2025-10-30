# 🔑 Admin Credentials - Madna Loyalty Platform

## Production Admin Account

**Email:** `super_admin@madna.me`
**Password:** `MadnaAdmin2024!`

**Business Name:** Madna Loyalty Platform - منصة مدنا للولاء
**License:** CR-MADNA-2024

---

## Login URL

**Dashboard:** `https://your-app.onrender.com/dashboard`
**Admin Login:** `https://your-app.onrender.com/admin/login`

---

## Database Initialization

After deploying to Render.com, run:

```bash
# Open Render Shell
cd /opt/render/project/src/backend
node scripts/reinitialize-production-db.js
```

This will:
- Drop and recreate all database tables
- Create admin account with credentials above
- Seed 2 test offers
- Create 3 test customers with different wallet configurations

---

## Test Customers

After initialization, you'll have:

1. **Ahmed Mohammed** (Google Wallet only)
   - Progress: 2/5 stamps
   - Wallet: Google Wallet

2. **Fatima Salem** (Apple Wallet only)
   - Progress: 7/10 stamps
   - Wallet: Apple Wallet

3. **Abdullah Khalid** (BOTH wallets)
   - Progress: 4/5 stamps
   - Wallets: Apple + Google

---

## Security Notes

⚠️ **IMPORTANT:**
- Change password after first login in production
- Keep credentials secure and don't commit to version control
- Use environment variables for production passwords
- Enable 2FA if available

---

## Support

For issues or questions:
- Check deployment logs in Render dashboard
- Review documentation in repository
- Test with provided test customers first

---

**Last Updated:** October 7, 2025
**Platform:** Madna Loyalty Platform
