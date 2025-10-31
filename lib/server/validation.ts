import { z } from "zod"

export const placeOrderSchema = z.object({
  tradingAccountId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  userName: z.string().nullable().optional(),
  userEmail: z.string().email().nullable().optional(),
  stockId: z.string().uuid().optional(),
  instrumentId: z.string().optional(),
  symbol: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().nullable().optional(),
  orderType: z.enum(["MARKET", "LIMIT"]),
  orderSide: z.enum(["BUY", "SELL"]),
  productType: z.string().optional(),
  segment: z.string().optional(),
  token: z.number().int().positive().optional(),
  exchange: z.string().optional(),
  name: z.string().optional(),
  ltp: z.number().optional(),
  close: z.number().optional(),
  strikePrice: z.number().optional(),
  optionType: z.enum(["CE", "PE"]).optional(),
  expiry: z.string().optional(),
  lotSize: z.number().positive().optional(),
  watchlistItemId: z.string().uuid().optional(),
})

export const modifyOrderSchema = z.object({
  orderId: z.string().uuid(),
  price: z.number().optional(),
  quantity: z.number().int().positive().optional(),
}).refine((v: { price?: number; quantity?: number }) => v.price !== undefined || v.quantity !== undefined, { message: "Provide price or quantity" })

export const cancelOrderSchema = z.object({
  orderId: z.string().uuid(),
})

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>
export type ModifyOrderInput = z.infer<typeof modifyOrderSchema>
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>


