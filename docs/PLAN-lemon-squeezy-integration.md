# PROJ-002: Lemon Squeezy Payment Integration

## Goal
Integrate Lemon Squeezy as the payment gateway for the Loyalty and POS subscription tiers. This enables automated recurring billing, subscription management, and immediate access provisioning.

## User Review Required
> [!IMPORTANT]
> **Production Testing**: Since local `ngrok` is not available, all webhook testing must occur on the production/staging server. We will implement a "dry run" mode or use test keys initially.

> [!NOTE]
> **Recurring Billing**: Lemon Squeezy handles the actual credit card charging and retries. Our verified task is to simply listen for `subscription_payment_success` or `subscription_expired` events to grant/revoke access.

> [!WARNING]
> **Variant IDs**: The code requires **Variant IDs** (specific directly to the Monthly/Yearly options), not just Product IDs.
> *   Loyalty Product ID: `781516` -> You likely have two variants (Monthly/Yearly) under this.
> *   POS Product ID: `781525` -> Similarly here.
> *   **Action**: We will add a script to `fetch-variants.js` to print these out for you so we can configure them.

## Configuration
### Variant IDs (from User)
*   **Loyalty Subscription**:
    *   Monthly: `1232165`
    *   Yearly: `1232086`
*   **POS Subscription**:
    *   Product ID: `781525`
    *   *Variant ID to be fetched during setup*
    *   **Strategy**: Quantity-based billing (1 quantity = 1 branch).

## Proposed Changes

### Database Layer
#### [MODIFY] [Subscription.js](file:///c:/Users/Design_Bench_12/Documents/claude-loyalty-program/backend/models/Subscription.js)
*   Add columns for Lemon Squeezy mapping:
    *   `lemon_squeezy_subscription_id` (String)
    *   `lemon_squeezy_customer_id` (String)
    *   `lemon_squeezy_variant_id` (String)
    *   `lemon_squeezy_status` (String)
*   Remove or deprecate `moyasar_token` if fully replacing.

### Backend (Node.js)
#### [NEW] `backend/services/LemonSqueezyService.js`
*   Methods:
    *   `createCheckout(businessId, variantId)`: Calls LS API.
    *   `handleWebhook(signature, payload)`: Validates and routes events.
    *   `syncSubscription(subscriptionObj)`: Updates local DB.
    *   `updateSubscriptionQuantity(subscriptionId, newQuantity)`: **[NEW]** Calls API to update quantity with `invoice_immediately: true`. Used when adding/removing branches.

#### [NEW] `backend/controllers/SubscriptionController.js`
*   `generateCheckoutUrl`: Authenticated endpoint.
*   `handleWebhook`: Public endpoint.

#### [MODIFY] `backend/controllers/BranchController.js`
*   **[CRITICAL]** Update `createBranch`:
    *   Check if Business has active "POS" subscription.
    *   If yes, call `LemonSqueezyService.updateSubscriptionQuantity(subId, currentBranches + 1)`.
    *   If API fails (payment failed), deny branch creation.
    *   If API succeeds, create branch in DB.
*   Update `deleteBranch`:
    *   Call `LemonSqueezyService.updateSubscriptionQuantity(subId, currentBranches - 1)`.

#### [NEW] `backend/routes/subscriptionRoutes.js`
*   Define API routes.

### Frontend (React)
#### [NEW] `src/pages/dashboard/BillingPage.jsx`
*   Status card: "Current Plan: Free / Loyalty / POS".
*   "Upgrade" buttons requiring API call to `generateCheckoutUrl`.
*   "Manage Subscription" button linking to Lemon Squeezy Customer Portal.

#### [MODIFY] `src/App.jsx`
*   Add route for `/dashboard/billing`.

## Verification Plan

### Automated Tests
*   **Unit**: Test `LemonSqueezyService` with mock API responses.
*   **Integration**: Test database updates when mock webhook payloads are processed.

### Manual Verification
1.  **Variant Discovery**: Run script to get correct IDs.
2.  **Checkout Flow**: Login as business -> Go to Billing -> Click "Upgrade" -> Verify redirect to Lemon Squeezy test mode.
3.  **Webhook Simulation**:
    *   Since we can't perform a real transaction locally, we will use a **Mock Webhook Script** (`scripts/simulate-ls-webhook.js`) to send a fake "subscription_created" payload to the local server to verify the database updates correctly without needing a public URL.

## Configuration
*   **Secrets**: add `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET` to `.env`.
