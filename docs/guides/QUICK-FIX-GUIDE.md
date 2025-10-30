# 🔧 How to Fix the "401 Unauthorized" Error

## The Problem
You're getting a 401 Unauthorized error because you need to **log in first** before accessing the dashboard.

## The Solution

### Step 1: Open the Login Page
Go to: http://localhost:3000/auth?mode=signin

### Step 2: Login with Test Credentials
- **Email**: info@alamalrestaurant.sa
- **Password**: password123

### Step 3: Access Dashboard
After successful login, you'll be redirected to: http://localhost:3000/dashboard

### Step 4: Create Offers & Branches
Now you can:
- Go to "My Offers" tab → Click "Create New Offer" ✅
- Go to "Branches" tab → Click "Add New Branch" ✅

## What Should Happen
- You'll see 6 existing offers (Saudi restaurant data)
- You'll see 6 existing branches (Saudi restaurant locations)
- You can create new ones that will be saved to the database
- Real analytics will show actual data

## If It Still Doesn't Work
1. **Clear browser cache** (Ctrl+Shift+R)
2. **Open browser console** (F12) and check for error messages
3. **Try incognito/private mode**

## Technical Notes
- The 401 error happens because the dashboard tries to load authenticated data
- You MUST be logged in first
- The React Router warnings are just warnings and won't affect functionality