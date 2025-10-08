# Console Testing Guide

## Quick Start

### 1. Prerequisites Check
```bash
# Check if PostgreSQL is running
sudo service postgresql status

# If not running, start it
sudo service postgresql start

# Verify database exists
sudo -u postgres psql -l | grep trading_platform
```

### 2. Start Development Server
```bash
cd /workspace
npm run dev
```

Wait for the server to start (you should see `Ready on http://localhost:3000`)

### 3. Access the Console

#### Option A: Using Browser
1. Open browser: `http://localhost:3000/auth/login`
2. Login with:
   - **Email**: `test@example.com`
   - **Password**: `password123`
3. Navigate to: `http://localhost:3000/console`

#### Option B: Using Curl (API Testing)
```bash
# This will redirect to login (expected behavior)
curl -v http://localhost:3000/api/console

# To test with authentication, you need a session token
# (easier to test via browser)
```

## Testing Each Console Section

### 1. Account Section
**What to test:**
- [ ] Balance displays correctly
- [ ] Available margin shows
- [ ] Used margin shows
- [ ] Toggle balance visibility works
- [ ] Refresh button works
- [ ] Charts render properly
- [ ] Loading state shows during data fetch
- [ ] Error state shows if API fails

**How to test:**
1. Navigate to console
2. Default section is "Account"
3. Click eye icon to hide/show balance
4. Click refresh icon to reload data
5. Check browser console for any errors

### 2. Profile Section
**What to test:**
- [ ] User profile loads
- [ ] Can edit profile fields
- [ ] Save changes works
- [ ] Validation works for required fields

**How to test:**
1. Click "Profile" in sidebar
2. Try editing name, email, etc.
3. Click "Save" and verify success message
4. Refresh and verify changes persisted

### 3. Bank Accounts Section
**What to test:**
- [ ] Bank accounts list loads
- [ ] Can add new bank account
- [ ] Can edit existing bank account
- [ ] Can delete bank account
- [ ] Default account toggle works

**How to test:**
1. Click "Bank Accounts" in sidebar
2. Click "Add Bank Account"
3. Fill in details and save
4. Verify new account appears
5. Try editing and deleting

### 4. Deposits Section
**What to test:**
- [ ] Deposit history loads
- [ ] Can create deposit request
- [ ] Different payment methods work (UPI, Bank)
- [ ] Status shows correctly (Pending, Completed, etc.)

**How to test:**
1. Click "Deposits" in sidebar
2. Click "Add Funds" or similar button
3. Fill in amount and method
4. Submit and verify request created
5. Check deposits table for new entry

### 5. Withdrawals Section
**What to test:**
- [ ] Withdrawal history loads
- [ ] Can create withdrawal request
- [ ] Balance validation works
- [ ] Bank account selection works

**How to test:**
1. Click "Withdrawals" in sidebar
2. Click "Withdraw Funds"
3. Try withdrawing more than available (should fail)
4. Try valid amount and verify request created

### 6. Statements Section
**What to test:**
- [ ] Transaction history loads
- [ ] Can filter by date range
- [ ] Can filter by type (Credit/Debit)
- [ ] Export functionality works

**How to test:**
1. Click "Statements" in sidebar
2. View transaction list
3. Try date filters
4. Try export button (if implemented)

## Error Handling Tests

### 1. Network Error Simulation
```bash
# Stop the development server
# Try to use console
# Should show "Network Error" message with retry button
```

### 2. Authentication Error Simulation
```bash
# Clear browser cookies/localStorage
# Try to access console directly at /console
# Should redirect to login
```

### 3. Database Error Simulation
```bash
# Stop PostgreSQL
sudo service postgresql stop

# Try to load console
# Should show "Server Error" message

# Restart PostgreSQL
sudo service postgresql start
```

### 4. Invalid Data Tests
Try to:
- [ ] Submit empty forms (should show validation errors)
- [ ] Submit invalid bank account (should fail)
- [ ] Withdraw more than available balance (should fail with message)
- [ ] Add bank account with existing account number (should handle gracefully)

## Performance Tests

### 1. Loading Speed
- [ ] Console loads in < 2 seconds
- [ ] API responses in < 500ms
- [ ] No lag when switching sections

**How to check:**
```bash
# Check server logs for timing info
# Look for: elapsed: XXXms
```

### 2. Concurrent Requests
- [ ] Multiple rapid refreshes don't break UI
- [ ] Can switch sections quickly without errors
- [ ] Loading states prevent duplicate requests

## Browser Console Checks

### Expected Logs (Normal Operation)
```
📥 [CONSOLE-API] GET request received
🔐 [CONSOLE-API] Session check: { hasSession: true, userId: '...' }
📊 [CONSOLE-API] Fetching console data for user: ...
✅ [CONSOLE-SERVICE] Data fetched successfully
✅ [CONSOLE-API] Console data fetched successfully
```

### Expected Logs (Error Case)
```
❌ [CONSOLE-API] Error in console GET: ...
🔍 [CONSOLE-API] Error details: { message: '...', stack: '...' }
```

### Red Flags (Things that shouldn't appear)
- ❌ Uncaught errors in browser console
- ❌ "Cannot read property of undefined"
- ❌ Network errors on initial load (with database running)
- ❌ Infinite loading states

## Mobile Testing

### Responsive Design Checks
1. Open console on mobile device or use browser dev tools
2. Test screen sizes:
   - [ ] Mobile (< 640px)
   - [ ] Tablet (640px - 1024px)
   - [ ] Desktop (> 1024px)

### Mobile-Specific Tests
- [ ] Sidebar drawer works on mobile
- [ ] Touch interactions work (swipe, tap)
- [ ] Forms are usable on small screens
- [ ] Charts render properly on mobile
- [ ] No horizontal scrolling

## Debugging Common Issues

### Issue: "Loading your console..." never completes
**Possible causes:**
1. Database not running → Check: `sudo service postgresql status`
2. Database connection error → Check: `.env` file DATABASE_URL
3. No user session → Check: Are you logged in?
4. Network error → Check: Is server running on :3000?

**Solution:**
```bash
# Check server logs in terminal where you ran npm run dev
# Look for error messages
# Try accessing /api/health to verify server is responding
curl http://localhost:3000/api/health
```

### Issue: "Error loading console" appears
**Possible causes:**
1. Database schema mismatch → Run: `npx prisma db push`
2. Missing data → Check: Does test user exist?
3. Permission error → Check: Console logs for "Unauthorized"

**Solution:**
```bash
# Re-sync database
npx prisma db push

# Re-create test user
npx tsx scripts/create-test-user.ts

# Check logs
tail -f ~/.npm/_logs/*.log
```

### Issue: Data not updating
**Possible causes:**
1. Cache issue → Clear browser cache
2. Stale data → Click refresh button
3. Database transaction failed → Check server logs

**Solution:**
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Click refresh button in console
- Check server logs for transaction errors

### Issue: Styles look broken
**Possible causes:**
1. Tailwind not compiled → Restart dev server
2. CSS cache issue → Hard refresh browser

**Solution:**
```bash
# Restart dev server
# Ctrl+C to stop, then:
npm run dev
```

## Automated Testing (Optional)

### API Tests with Curl
```bash
# Health check
curl http://localhost:3000/api/health

# Console API (requires authentication)
# Use browser to get auth cookie, then:
curl -H "Cookie: authjs.session-token=YOUR_TOKEN" \
  http://localhost:3000/api/console
```

### Load Testing (Optional)
```bash
# Install hey (HTTP load testing tool)
# Mac: brew install hey
# Linux: go install github.com/rakyll/hey@latest

# Test API under load
hey -n 100 -c 10 http://localhost:3000/api/health
```

## Success Criteria

The console is working correctly if:
- ✅ All sections load without errors
- ✅ Data displays correctly in all sections
- ✅ CRUD operations work (Create, Read, Update, Delete)
- ✅ Error handling shows friendly messages
- ✅ Loading states appear during operations
- ✅ Retry functionality works after errors
- ✅ Mobile responsive design works
- ✅ No console errors in browser
- ✅ API responses are fast (< 1s)
- ✅ Logs show detailed operation info

## Reporting Issues

If you find bugs, provide:
1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Browser console errors** (if any)
5. **Server logs** (relevant portions)
6. **Screenshots** (if UI issue)

## Performance Benchmarks

Expected performance:
- **Initial console load**: < 2 seconds
- **API response time**: < 500ms
- **Section switching**: < 100ms
- **Form submission**: < 1 second

If your measurements exceed these, check:
- Database query performance
- Network latency
- Server resources (CPU, memory)

## Security Checks

- [ ] Cannot access console without authentication
- [ ] Cannot access other users' data
- [ ] Sensitive data (passwords, full account numbers) not exposed in logs
- [ ] CSRF protection enabled
- [ ] SQL injection protection (Prisma handles this)
- [ ] XSS protection (React handles this)

## Final Checklist

Before considering the console "complete":
- [ ] All sections accessible
- [ ] All CRUD operations work
- [ ] Error handling comprehensive
- [ ] Loading states present
- [ ] Mobile responsive
- [ ] No console errors
- [ ] API routes secured
- [ ] Data validation works
- [ ] Performance acceptable
- [ ] Logs are helpful for debugging

---

## Quick Test Script

```bash
#!/bin/bash
echo "🧪 Starting Console Tests..."

# 1. Check PostgreSQL
echo "1️⃣ Checking PostgreSQL..."
sudo service postgresql status > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not running. Starting..."
    sudo service postgresql start
fi

# 2. Check database
echo "2️⃣ Checking database..."
sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw trading_platform
if [ $? -eq 0 ]; then
    echo "✅ Database exists"
else
    echo "❌ Database does not exist"
fi

# 3. Check server
echo "3️⃣ Checking server..."
curl -s http://localhost:3000/api/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Server is responding"
else
    echo "❌ Server is not responding"
fi

# 4. Test console API
echo "4️⃣ Testing console API..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/console)
if [ "$RESPONSE" = "307" ] || [ "$RESPONSE" = "401" ]; then
    echo "✅ Console API is working (redirecting to auth as expected)"
else
    echo "⚠️  Unexpected response code: $RESPONSE"
fi

echo "✅ Tests complete!"
```

Save this as `test-console.sh`, make it executable (`chmod +x test-console.sh`), and run it to quickly verify everything is working.
