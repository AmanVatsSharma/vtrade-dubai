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

jest.mock("@/lib/redis/redis-client", () => {
  return {
    isRedisEnabled: jest.fn(() => true),
    redisSet: jest.fn(async () => {}),
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

jest.mock("@/lib/services/position/PositionManagementService", () => {
  const svc = {
    closePosition: jest.fn(async () => ({
      success: true,
      positionId: "mock-position",
      exitOrderId: "mock-exit-order",
      realizedPnL: 0,
      exitPrice: 0,
      marginReleased: 0,
      message: "mock close ok",
    })),
  }
  return {
    createPositionManagementService: () => svc,
    __svc: svc,
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
      riskAlert: {
        create: jest.fn(),
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

const redisMock = jest.requireMock("@/lib/redis/redis-client") as {
  redisSet: jest.Mock
}

const positionMgmtMock = jest.requireMock("@/lib/services/position/PositionManagementService").__svc as {
  closePosition: jest.Mock
}

describe("PositionPnLWorker", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete (globalThis as any).__riskAlertThrottleByAccount
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
    expect(redisMock.redisSet).toHaveBeenCalled()
    const updateCall = prismaMock.position.update.mock.calls[0]?.[0]
    expect(updateCall.where).toEqual({ id: "p-1" })
    // 110 - 100 = 10; 110 - 105 = 5
    expect(String(updateCall.data.unrealizedPnL)).toContain("10")
    expect(String(updateCall.data.dayPnL)).toContain("5")
  })

  it("auto-closes a position when stopLoss is hit (server-side)", async () => {
    marketSvcMock.getQuote.mockReturnValueOnce({
      instrumentToken: 26000,
      last_trade_price: 90,
      close: 100,
      prev_close_price: 100,
      receivedAt: Date.now(),
    })

    prismaMock.position.findMany.mockResolvedValue([
      {
        id: "p-sl",
        tradingAccountId: "ta-1",
        symbol: "SLTEST",
        quantity: 1,
        averagePrice: new Prisma.Decimal("100.00"),
        unrealizedPnL: new Prisma.Decimal("0.00"),
        dayPnL: new Prisma.Decimal("0.00"),
        stopLoss: new Prisma.Decimal("95.00"),
        target: null,
        tradingAccount: { userId: "u-1", balance: 1000, availableMargin: 0 },
        Stock: {
          instrumentId: "NSE_EQ-26000",
          ltp: 0,
        },
      },
    ])

    prismaMock.position.update.mockResolvedValue({ id: "p-sl" })

    const worker = new PositionPnLWorker()
    const res = await worker.processPositionPnL({ limit: 10, updateThreshold: 0 })

    expect(res.success).toBe(true)
    expect(positionMgmtMock.closePosition).toHaveBeenCalledTimes(1)
    expect(positionMgmtMock.closePosition).toHaveBeenCalledWith("p-sl", "ta-1", 90)
  })

  it("auto-closes worst losing position when risk autoCloseThreshold is breached", async () => {
    marketSvcMock.getQuote.mockReturnValue({
      instrumentToken: 26000,
      last_trade_price: 100,
      close: 100,
      prev_close_price: 100,
      receivedAt: Date.now(),
    })

    prismaMock.position.findMany.mockResolvedValue([
      {
        id: "p-risk-1",
        tradingAccountId: "ta-risk",
        symbol: "AAA",
        quantity: 1,
        averagePrice: new Prisma.Decimal("220.00"),
        unrealizedPnL: new Prisma.Decimal("0.00"),
        dayPnL: new Prisma.Decimal("0.00"),
        stopLoss: null,
        target: null,
        tradingAccount: { userId: "u-risk", balance: 200, availableMargin: 0 },
        Stock: { instrumentId: "NSE_EQ-26000", ltp: 0 },
      },
      {
        id: "p-risk-2",
        tradingAccountId: "ta-risk",
        symbol: "BBB",
        quantity: 1,
        averagePrice: new Prisma.Decimal("260.00"),
        unrealizedPnL: new Prisma.Decimal("0.00"),
        dayPnL: new Prisma.Decimal("0.00"),
        stopLoss: null,
        target: null,
        tradingAccount: { userId: "u-risk", balance: 200, availableMargin: 0 },
        Stock: { instrumentId: "NSE_EQ-26000", ltp: 0 },
      },
    ])

    prismaMock.position.update.mockResolvedValue({ id: "x" })

    const worker = new PositionPnLWorker()
    const res = await worker.processPositionPnL({ limit: 10, updateThreshold: 0 })

    expect(res.success).toBe(true)
    // Worst is BBB: (100 - 260) = -160
    expect(positionMgmtMock.closePosition).toHaveBeenCalledWith("p-risk-2", "ta-risk", 100)

    const prismaAny = jest.requireMock("@/lib/prisma").prisma as any
    expect(prismaAny.riskAlert.create).toHaveBeenCalled()
  })
})

