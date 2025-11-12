/**
 * @file route.ts
 * @module api-risk-config
 * @description Risk configuration lookup API for margin/brokerage preview in Order dialog
 * @author BharatERP
 * @created 2025-11-12
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function getDefaultLeverage(segment: string, productType: string): number {
  const seg = (segment || '').toUpperCase()
  const prod = (productType || '').toUpperCase()
  if (seg === 'NSE' || seg === 'NSE_EQ') {
    if (prod === 'MIS' || prod === 'INTRADAY') return 200
    if (prod === 'CNC' || prod === 'DELIVERY') return 50
  }
  if (seg === 'NFO' || seg === 'FNO') return 100
  if (seg === 'MCX') return 50
  return 1
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const rawSegment = url.searchParams.get('segment') || ''
    const rawProductType = url.searchParams.get('productType') || ''

    const segment = rawSegment.toUpperCase()
    const productType = rawProductType.toUpperCase()

    if (!segment || !productType) {
      return NextResponse.json(
        { success: false, error: 'segment and productType are required' },
        { status: 400 }
      )
    }

    const config = await prisma.riskConfig.findFirst({
      where: { segment, productType, active: true },
      select: {
        leverage: true,
        brokerageFlat: true,
        brokerageRate: true,
        brokerageCap: true
      }
    })

    const response = {
      success: true,
      data: {
        segment,
        productType,
        leverage: Number(config?.leverage ?? getDefaultLeverage(segment, productType)),
        // Leave brokerage fields as provided by DB; if null, client should fallback to defaults
        brokerageFlat: config?.brokerageFlat != null ? Number(config.brokerageFlat) : null,
        brokerageRate: config?.brokerageRate != null ? Number(config.brokerageRate) : null,
        brokerageCap: config?.brokerageCap != null ? Number(config.brokerageCap) : null
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load risk config' },
      { status: 500 }
    )
  }
}


