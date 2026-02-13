/**
 * @file tests/position/position-pnl-worker.test.ts
 * @module tests-position
 * @description Unit tests for `PositionPnLWorker` marketdata quote cache integration (no external WS/DB required).
 * @author BharatERP
 * @created 2026-02-12
 */

import { Prisma } from "@prisma/client"

jest.mock("@/lib/market-data/server-market-data.service", () => {
  const svc = {
    ensureInitialized: jest.fn(async () => {}),
    ensureSubscribed: jest.fn(() => {}),
    getQuote: jest.fn(() => ({
      instrumentToken: 26000,
      last_trade_price: 110,
      close: 105,
      prev_close_price: 105,
      receivedAt: Date.now(),
    })),
  }

  return {
    getServerMarketDataService: () => svc,
    __svc: svc,
  }
})

jest.mock("@/lib/server/workers/system-settings", () => {
  return {
    getLatestActiveGlobalSettings: jest.fn(async (keys: string[]) => {
      const m = new Map<string, { value: string }>()
      // Enable server mode so the worker runs.
      if (keys.includes("position_pnl_mode")) m.set("position_pnl_mode", { value: "server" })
      return m
    }),
  }
})

jest.mock("@/lib/prisma", () => {
  const tx = {
    systemSettings: {
      findFirst: jest.fn(async () => null),
      update: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({})),
      create: jest.fn(async () => ({})),
    },
  }

  return {
    prisma: {
      __tx: tx,
      $transaction: jest.fn(async (fn: any) => fn(tx)),
      position: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      systemSettings: tx.systemSettings,
    },
  }
})

import { PositionPnLWorker } from "@/lib/services/position/PositionPnLWorker"

const prismaMock = jest.requireMock("@/lib/prisma").prisma as {
  position: { findMany: jest.Mock; update: jest.Mock }
}

const marketSvcMock = jest.requireMock("@/lib/market-data/server-market-data.service").__svc as {
  ensureInitialized: jest.Mock
  ensureSubscribed: jest.Mock
  getQuote: jest.Mock
}

describe("PositionPnLWorker", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("subscribes to position tokens and persists PnL from cached WS quotes", async () => {
    prismaMock.position.findMany.mockResolvedValue([
      {
        id: "p-1",
        quantity: 1,
        averagePrice: new Prisma.Decimal("100.00"),
        unrealizedPnL: new Prisma.Decimal("0.00"),
        dayPnL: new Prisma.Decimal("0.00"),
        Stock: {
          instrumentId: "NSE_EQ-26000",
          ltp: 0,
        },
      },
    ])

    prismaMock.position.update.mockResolvedValue({ id: "p-1" })

    const worker = new PositionPnLWorker()
    const res = await worker.processPositionPnL({ limit: 10, updateThreshold: 0 })

    expect(res.success).toBe(true)
    expect(marketSvcMock.ensureInitialized).toHaveBeenCalled()
    expect(marketSvcMock.ensureSubscribed).toHaveBeenCalledWith([26000])
    expect(marketSvcMock.getQuote).toHaveBeenCalledWith(26000)

    expect(prismaMock.position.update).toHaveBeenCalledTimes(1)
    const updateCall = prismaMock.position.update.mock.calls[0]?.[0]
    expect(updateCall.where).toEqual({ id: "p-1" })
    // 110 - 100 = 10; 110 - 105 = 5
    expect(String(updateCall.data.unrealizedPnL)).toContain("10")
    expect(String(updateCall.data.dayPnL)).toContain("5")
  })
})

