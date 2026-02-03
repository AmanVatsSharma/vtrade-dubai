/**
 * @file tests/order/order-execution-worker.test.ts
 * @module tests-order
 * @description Unit tests for `OrderExecutionWorker` cancellation/skip behavior (no DB required).
 * @author BharatERP
 * @created 2026-02-03
 */

import { OrderExecutionWorker } from "@/lib/services/order/OrderExecutionWorker"
import { OrderSide, OrderStatus, OrderType } from "@prisma/client"

const prismaMock = {
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn()
  }
}

jest.mock("@/lib/prisma", () => ({
  prisma: prismaMock
}))

describe("OrderExecutionWorker", () => {
  beforeEach(() => {
    jest.clearAllMocks()
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

