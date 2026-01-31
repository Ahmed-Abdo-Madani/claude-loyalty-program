# Backend Testing Documentation

This directory contains standalone test scripts for validating backend services and logic. These tests use the built-in Node.js `assert` module and do not require external testing frameworks.

## Performance & Core Logic Tests

### Subscription Plans Validation
- **File:** [subscription-plans.test.js](file:///home/doni/Documents/claude-loyalty-program/backend/test/subscription-plans.test.js)
- **Purpose:** Validates the 6-tier subscription plan system (Loyalty & POS).
- **Coverage:** Pricing, limits, features, upgrade/downgrade paths, and backward compatibility.
- **Run command:** `npm run test:subscription-plans`

### Stamp Layout Algorithm
- **File:** [StampImageGenerator.test.js](file:///home/doni/Documents/claude-loyalty-program/backend/test/StampImageGenerator.test.js)
- **Purpose:** Validates grid layout calculations for Apple Wallet stamp cards.
- **Run command:** `npm run test:stamps`

## Running All Tests
To execute all backend test suites:
```bash
npm run test
```

## Maintenance Guidelines
- Every new business logic service should have a corresponding `.test.js` file here.
- Tests should be self-contained and not depend on a running database where possible (unit tests).
- Follow the ANSI color-coded output pattern for consistency.
