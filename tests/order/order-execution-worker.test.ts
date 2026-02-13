/**
 * @file tests/order/order-execution-worker.test.ts
 * @module tests-order
 * @description Unit tests for `OrderExecutionWorker` cancellation/skip behavior (no DB required).
 * @author BharatERP
 * @created 2026-02-03
 */

import { OrderSide, OrderStatus, OrderType } from "@prisma/client"

jest.mock("@/lib/market-data/server-market-data.service", () => {
  return {
    getServerMarketDataService: () => ({
      ensureInitialized: jest.fn(async () => {}),
      ensureSubscribed: jest.fn(() => {}),
      getQuote: jest.fn(() => null),
    }),
  }
})

jest.mock("@/lib/prisma", () => {
  const tx = {
    $queryRaw: jest.fn(),
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  }

  return {
    prisma: {
      // Expose tx for unit tests
      __tx: tx,
      $transaction: jest.fn(async (fn: any) => fn(tx)),
      order: tx.order,
    },
  }
})

import { OrderExecutionWorker } from "@/lib/services/order/OrderExecutionWorker"

const prismaMock = jest.requireMock("@/lib/prisma").prisma as {
  __tx: {
    $queryRaw: jest.Mock
    order: {
      findUnique: jest.Mock
      update: jest.Mock
      findMany: jest.Mock
    }
  }
  $transaction: jest.Mock
  order: {
    findUnique: jest.Mock
    update: jest.Mock
    findMany: jest.Mock
  }
}

const txMock = prismaMock.__tx

describe("OrderExecutionWorker", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: advisory lock acquired
    txMock.$queryRaw.mockResolvedValue([{ locked: true }])
  })

  it("uses single-argument bigint advisory lock key (regression)", async () => {
    prismaMock.order.findUnique.mockResolvedValue(null)

    const worker = new OrderExecutionWorker()
    await worker.processOrderById("o-lock-regression")

    expect(txMock.$queryRaw).toHaveBeenCalled()
    const firstCallArg = txMock.$queryRaw.mock.calls[0]?.[0] as any

    // Prisma.sql(...) typically produces an object with a `.sql` string field.
    const sqlText =
      typeof firstCallArg === "string"
        ? firstCallArg
        : typeof firstCallArg?.sql === "string"
          ? firstCallArg.sql
          : ""

    expect(sqlText).toContain("pg_try_advisory_xact_lock")
    expect(sqlText).toContain("<< 32")
    expect(sqlText).toContain("hashtext")
    // Guard against reintroducing the 2-argument overload usage.
    expect(sqlText).not.toMatch(/pg_try_advisory_xact_lock\s*\([^)]*,/)
  })

  it("cancels a PENDING order when no valid execution price is available", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: "o-1",
      status: OrderStatus.PENDING,
      tradingAccountId: "acct-1",
      symbol: "RELIANCE",
      quantity: 1,
      orderType: OrderType.MARKET,
      orderSide: OrderSide.BUY,
      productType: "MIS",
      price: null,
      averagePrice: null,
      stockId: "s-1",
      Stock: { id: "s-1", ltp: 0, segment: "NSE", lot_size: 1 },
      tradingAccount: { id: "acct-1", userId: "u-1" }
    })

    prismaMock.order.update.mockResolvedValue({ id: "o-1", status: OrderStatus.CANCELLED })

    const worker = new OrderExecutionWorker()
    const outcome = await worker.processOrderById("o-1")

    expect(outcome).toBe("cancelled")
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: "o-1" },
      data: { status: OrderStatus.CANCELLED }
    })
  })

  it("skips when order is not found", async () => {
    prismaMock.order.findUnique.mockResolvedValue(null)

    const worker = new OrderExecutionWorker()
    const outcome = await worker.processOrderById("missing")

    expect(outcome).toBe("skipped")
    expect(prismaMock.order.update).not.toHaveBeenCalled()
  })

  it("skips when order is not PENDING", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: "o-2",
      status: OrderStatus.EXECUTED
    })

    const worker = new OrderExecutionWorker()
    const outcome = await worker.processOrderById("o-2")

    expect(outcome).toBe("skipped")
    expect(prismaMock.order.update).not.toHaveBeenCalled()
  })
})

