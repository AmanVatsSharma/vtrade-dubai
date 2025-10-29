/**
 * Migration script to populate new WatchlistItem fields from existing Stock data
 * Run this BEFORE applying the schema changes
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateWatchlistData() {
  console.log('🔄 Starting WatchlistItem data migration...')

  try {
    // Get all existing WatchlistItem records
    const items = await prisma.watchlistItem.findMany({
      include: {
        // @ts-ignore - Stock relation may be commented out
        stock: true,
      },
    })

    console.log(`📊 Found ${items.length} WatchlistItem records to migrate`)

    let migrated = 0
    let skipped = 0

    for (const item of items) {
      // @ts-ignore
      const stock = (item as any).stock

      // If we have stock data, use it; otherwise use defaults
      const updateData: any = {
        symbol: stock?.symbol || stock?.ticker || 'UNKNOWN',
        exchange: stock?.exchange || 'NSE',
        segment: stock?.segment || 'NSE',
        name: stock?.name || stock?.symbol || stock?.ticker || 'Unknown',
        ltp: stock?.ltp || 0,
        close: stock?.close || 0,
        strikePrice: stock?.strikePrice,
        optionType: stock?.optionType,
        expiry: stock?.expiry,
        lotSize: stock?.lot_size,
      }

      // Only update token if we have it from stock (and item doesn't have it)
      if (!item.token && stock?.token) {
        updateData.token = stock.token
      }

      try {
        await prisma.watchlistItem.update({
          where: { id: item.id },
          data: updateData,
        })
        migrated++
        console.log(`✅ Migrated item ${item.id}: ${updateData.symbol}`)
      } catch (error) {
        console.error(`❌ Failed to migrate item ${item.id}:`, error)
        skipped++
      }
    }

    console.log(`\n✅ Migration complete!`)
    console.log(`   Migrated: ${migrated}`)
    console.log(`   Skipped: ${skipped}`)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
migrateWatchlistData()
  .catch((error) => {
    console.error('Migration error:', error)
    process.exit(1)
  })

