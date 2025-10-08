# Watchlist Setup Guide

## Post-Migration Steps

After completing the migration from GraphQL to Prisma, follow these steps to ensure everything works correctly:

### 1. Generate Prisma Client

The Prisma client needs to be regenerated to include the latest schema changes:

```bash
npx prisma generate
```

This will create the necessary TypeScript types and client in `node_modules/@prisma/client`.

### 2. Verify Database Connection

Ensure your database connection is working:

```bash
npx prisma db push
```

Or if you need to run migrations:

```bash
npx prisma migrate dev
```

### 3. Install Dependencies (if needed)

If you see module resolution errors, ensure all dependencies are installed:

```bash
npm install
# or
pnpm install
# or
yarn install
```

### 4. Restart Development Server

After generating the Prisma client, restart your development server:

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

### 5. Test the Watchlist Functionality

#### Test Checklist:

1. **Create Watchlist**
   - Click "+" button to create a new watchlist
   - Verify it appears in the tabs
   - Check that default watchlist logic works

2. **Add Items**
   - Click search bar to add stocks
   - Search for a stock
   - Add it to the watchlist
   - Verify it appears in the list

3. **Left Swipe Delete** ✅
   - Swipe left on a watchlist item
   - Red delete button should appear
   - Click delete
   - Item should be removed with animation
   - List should refresh automatically

4. **Update Items**
   - Click on an item to expand details
   - Modify alert prices or notes
   - Verify changes persist

5. **Delete Watchlist**
   - Go to watchlist settings
   - Delete a watchlist
   - Verify cascade delete removes all items

### 6. Check Console Logs

Transaction logs should appear in the console:

```
🔄 Starting database transaction
📋 Creating watchlist for user: [userId]
✅ Watchlist created: [watchlistId]
✅ Transaction completed successfully in XXms
```

For deletions:
```
🔄 Starting database transaction
🗑️ Removing item from watchlist: [itemId]
✅ Watchlist item removed: [itemId]
✅ Transaction completed successfully in XXms
```

### 7. Monitor Performance

Watch for these indicators:

- ✅ Fast response times (< 100ms for most operations)
- ✅ Smooth UI updates
- ✅ No errors in console
- ✅ Toast notifications working
- ✅ Loading states showing correctly

## Troubleshooting

### Issue: "Cannot find module '@prisma/client'"

**Solution:**
```bash
npx prisma generate
```

### Issue: "Database connection failed"

**Solution:**
Check your `.env` file:
```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

### Issue: "Left swipe delete not working"

**Check:**
1. Is the `onRemove` prop passed to `WatchlistItemCard`?
2. Is `handleRemoveItem` calling the correct hook?
3. Check console for API errors
4. Verify session authentication is working

### Issue: "Items not refreshing after delete"

**Solution:**
The `refetchWatchlists()` should be called after deletion. Check:
```typescript
const handleRemoveItem = useCallback(async (itemId: string) => {
  setRemovingItems(prev => new Set(prev).add(itemId))
  try {
    await removeItem(itemId)
    await refetchWatchlists() // This must be called
  } catch (error) {
    // Error handling
  } finally {
    setRemovingItems(prev => {
      const newSet = new Set(prev)
      newSet.delete(itemId)
      return newSet
    })
  }
}, [removeItem, refetchWatchlists])
```

### Issue: "Transaction timeout"

**Solution:**
Increase timeout in transaction options:
```typescript
return withTransaction(async (tx) => {
  // Your transaction code
}, {
  timeout: 20000, // 20 seconds
})
```

## API Endpoints Reference

All watchlist operations now use these endpoints:

- `GET /api/watchlists` - Get all watchlists
- `POST /api/watchlists` - Create watchlist
- `GET /api/watchlists/[id]` - Get single watchlist
- `PUT /api/watchlists/[id]` - Update watchlist
- `DELETE /api/watchlists/[id]` - Delete watchlist
- `POST /api/watchlists/[id]/items` - Add item
- `GET /api/watchlists/items/[itemId]` - Get item
- `PUT /api/watchlists/items/[itemId]` - Update item
- `DELETE /api/watchlists/items/[itemId]` - Remove item (Left swipe delete)

## Environment Variables

Ensure these are set in your `.env`:

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
```

## Success Indicators

✅ Prisma client generated successfully
✅ Database connection established
✅ All API routes responding correctly
✅ Left swipe delete working smoothly
✅ Toast notifications appearing
✅ Data persisting across page reloads
✅ Transaction logs visible in console
✅ No errors in browser console
✅ Fast response times

## Support

If you encounter issues:

1. Check the console for detailed error messages
2. Verify all environment variables are set
3. Ensure database is accessible
4. Check that Prisma client is generated
5. Review transaction logs
6. Test API endpoints directly with curl or Postman

---

**Status**: Ready for testing
**Date**: 2025-10-08
**Next**: Run setup steps and test functionality