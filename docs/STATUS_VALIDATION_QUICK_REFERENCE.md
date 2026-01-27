# Status Validation Quick Reference

## Offer Statuses

| Status | New Signups | Existing Customers | Use Case |
|--------|-------------|-------------------|----------|
| `active` | ✅ Allowed | ✅ Can scan/redeem | Normal operation |
| `paused` | ❌ Blocked | ✅ Can scan/redeem | Temporary suspension |
| `inactive` | ❌ Blocked | ✅ Can scan/redeem | Deactivated |
| `expired` | ❌ Blocked | ✅ Can scan/redeem | Past end_date |

## Branch Statuses

| Status | Manager Login | POS Operations | Use Case |
|--------|--------------|----------------|----------|
| `active` + POS ON | ✅ Allowed | ✅ Allowed | Normal operation |
| `active` + POS OFF | ❌ Blocked | ❌ Blocked | Maintenance mode |
| `inactive` | ❌ Blocked | ❌ Blocked | Temporary closure |
| `closed` | ❌ Blocked | ❌ Blocked | Permanent closure |

## Error Codes

| Code | HTTP | Blocking | Where |
|------|------|----------|-------|
| `OFFER_PAUSED` | 200 | No | Scan/POS |
| `OFFER_INACTIVE` | 200 | No | Scan/POS |
| `OFFER_EXPIRED` | 200 | No | Scan/POS |
| `BRANCH_INACTIVE` | 403 | Yes | Login |
| `BRANCH_CLOSED` | 403 | Yes | Login |
| `POS_ACCESS_DISABLED` | 403 | Yes | Login |

## Quick Actions

```bash
# Check offer status
curl GET /api/business/public/offer/:offerId

# Test branch login
curl POST /api/branch-manager/login -d '{"branchId":"...","pin":"..."}'

# Run tests
npm run test:status-validation
```

## Files Reference

- Models: `backend/models/Offer.js`, `backend/models/Branch.js`
- Routes: `backend/routes/branchManager.js`, `backend/routes/pos.js`
- Frontend: `src/pages/CustomerSignup.jsx`, `src/pages/BranchScanner.jsx`
- Tests: `backend/test/*-status-validation.test.js`
- Docs: `docs/STATUS_VALIDATION.md`
