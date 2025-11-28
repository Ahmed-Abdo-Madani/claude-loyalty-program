# POS Checkout Button Padding Fix

## Issue
The checkout button had no padding at the bottom, appearing flush with the screen edge.

## Root Cause Analysis
The footer container used the class `pb-safe`.
- In `src/index.css`, `.pb-safe` is defined as `padding-bottom: env(safe-area-inset-bottom, 0px)`.
- On devices without a safe area (like most desktops or standard mobile views), `env(safe-area-inset-bottom)` evaluates to `0px`.
- This `0px` padding overrides the `1rem` padding provided by the `p-4` utility (which sets padding on all sides).
- Result: `padding-bottom: 0px`.

## Fix Implementation
Updated `src/components/pos/POSCart.jsx`:
- Replaced `pb-safe` with `pb-[calc(1rem+env(safe-area-inset-bottom,0px))]`.
- This ensures there is **always** at least `1rem` (16px) of padding at the bottom.
- On devices with a safe area (e.g., iPhone X+), it adds the safe area inset *on top* of the 1rem padding, ensuring the button isn't covered by the home indicator but still has breathing room.

## Verification Steps
1. **Desktop/Standard Mobile**:
   - Open POS.
   - **Verify**: There is ~16px padding below the checkout button.
2. **iPhone (with Notch/Home Bar)**:
   - Open POS.
   - **Verify**: There is ~16px + Home Bar height padding below the button.

## Code Verification
- `POSCart.jsx`: Footer div uses `pb-[calc(1rem+env(safe-area-inset-bottom,0px))]`.
