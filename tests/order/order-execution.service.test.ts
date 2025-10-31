/**
 * @file tests/order/order-execution.service.test.ts
 * @module tests-order
 * @description Unit tests covering stock recovery helpers in OrderExecutionService
 * @author BharatERP
 * @created 2025-10-31
 */

import { OrderExecutionService } from "@/lib/services/order/OrderExecutionService"
import { OrderType, OrderSide } from "@prisma/client"

describe("OrderExecutionService stock resolution", () => {
  const buildService = () => {
    const loggerMock = {
      warn: jest.fn().mockResolvedValue(undefined),
      logSystemEvent: jest.fn().mockResolvedValue(undefined),
      error: jest.fn().mockResolvedValue(undefined)
    } as any

    const service = new OrderExecutionService(loggerMock)
    return { service, loggerMock }
  }

  const baseInput = {
    tradingAccountId: "acct-1",
    stockId: "stock-1",
    instrumentId: "NSE_EQ-123456",
    symbol: "RELIANCE",
    quantity: 1,
    price: null,
    orderType: OrderType.MARKET,
    orderSide: OrderSide.BUY,
    productType: "MIS",
    segment: "NSE",
    lotSize: 1
  }

  it("returns existing stock when found by primary id", async () => {
    const { service } = buildService()

    const existingStock = { id: "stock-1" }

    const tx = {
      stock: {
        findUnique: jest.fn().mockResolvedValue(existingStock),
        findFirst: jest.fn(),
        create: jest.fn()
      },
      watchlistItem: {
        findFirst: jest.fn()
      }
    }

    const result = await (service as any).ensureStockForOrder(tx, baseInput)

    expect(result).toBe(existingStock)
    expect(tx.stock.findUnique).toHaveBeenCalledTimes(1)
    expect(tx.stock.findFirst).not.toHaveBeenCalled()
    expect(tx.stock.create).not.toHaveBeenCalled()
  })

  it("recovers stock using token and instrument lookups", async () => {
    const { service, loggerMock } = buildService()

    const recoveredStock = { id: "stock-2" }

    const tx = {
      stock: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValueOnce(recoveredStock),
        create: jest.fn()
      },
      watchlistItem: {
        findFirst: jest.fn()
      }
    }

    const input = { ...baseInput, stockId: "missing", instrumentId: "NSE_EQ-555555" }

    const result = await (service as any).ensureStockForOrder(tx, input)

    expect(result).toBe(recoveredStock)
    expect(tx.stock.findUnique).toHaveBeenCalledTimes(1)
    expect(tx.stock.findFirst).toHaveBeenCalledTimes(1)
    expect(tx.stock.create).not.toHaveBeenCalled()
    expect(loggerMock.warn).toHaveBeenCalled()
  })

  it("creates a new stock using watchlist metadata when none exist", async () => {
    const { service, loggerMock } = buildService()

    const createdStock = { id: "stock-3" }

    const watchlistMeta = {
      token: 789012,
      name: "Reliance Industries",
      symbol: "RELIANCE",
      exchange: "NSE_EQ",
      segment: "NSE_EQ",
      ltp: 2500,
      close: 2490,
      strikePrice: null,
      optionType: null,
      expiry: null,
      lotSize: 1
    }

    const tx = {
      stock: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        create: jest.fn().mockResolvedValue(createdStock)
      },
      watchlistItem: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(watchlistMeta)
      }
    }

    const input = {
      ...baseInput,
      stockId: "missing",
      instrumentId: "NSE_EQ-789012"
    }

    const result = await (service as any).ensureStockForOrder(tx, input)

    expect(result).toBe(createdStock)
    expect(tx.stock.create).toHaveBeenCalledTimes(1)
    expect(tx.stock.create.mock.calls[0][0].data.instrumentId).toBe("NSE_EQ-789012")
    expect(tx.stock.create.mock.calls[0][0].data.token).toBe(789012)
    expect(loggerMock.warn).toHaveBeenCalled()
    expect(loggerMock.logSystemEvent).toHaveBeenCalled()
  })
})

