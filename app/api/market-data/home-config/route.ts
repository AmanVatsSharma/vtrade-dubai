/**
 * @file route.ts
 * @module market-data-home-config
 * @description API endpoint to fetch home tab configuration from system settings
 * @author BharatERP
 * @created 2025-01-27
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/market-data/home-config
 * Fetch home tab configuration from system settings
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔹 [HOME-CONFIG] Fetching home tab configuration');

    const setting = await prisma.systemSettings.findUnique({
      where: { key: 'home_tab_config' },
    });

    if (!setting || !setting.isActive) {
      // Return default config
      const defaultConfig = {
        tickerTapeSymbols: [
          'NSE:NIFTY',
          'NSE:BANKNIFTY',
          'NSE:RELIANCE',
          'NSE:TCS',
          'NSE:HDFCBANK',
          'NSE:INFY',
          'NSE:ICICIBANK',
          'NSE:SBIN',
          'NSE:BHARTIARTL',
          'NSE:ITC',
        ],
        chartSymbol: 'NSE:NIFTY',
        enabledWidgets: {
          tickerTape: true,
          chart: true,
          heatmap: true,
          screener: false,
          topMovers: true,
          sectorPerformance: true,
          ipoEvents: true,
          marketNews: true,
          marketStats: true,
        },
        defaultSectors: ['IT', 'Banking', 'Pharma', 'Auto', 'FMCG', 'Energy'],
      };

      return NextResponse.json({
        success: true,
        config: defaultConfig,
        isDefault: true,
      });
    }

    const config = JSON.parse(setting.value);

    console.log('✅ [HOME-CONFIG] Configuration fetched');

    return NextResponse.json({
      success: true,
      config,
      isDefault: false,
    });
  } catch (error) {
    console.error('❌ [HOME-CONFIG] Error fetching config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch configuration',
      },
      { status: 500 }
    );
  }
}
