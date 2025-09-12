export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          name: string | null
          role: 'USER' | 'ADMIN' | 'MODERATOR'
          emailVerified: Date | null
          password: string | null
          image: string | null
          phone: string | null
          bio: string | null
          isActive: boolean
          client_id: string | null
          createdAt: Date
          updatedAt: Date
        }
        Insert: {
          id?: string
          email?: string | null
          name?: string | null
          role?: 'USER' | 'ADMIN' | 'MODERATOR'
          emailVerified?: Date | null
          password?: string | null
          image?: string | null
          phone?: string | null
          bio?: string | null
          isActive?: boolean
          client_id?: string | null
          createdAt?: Date
          updatedAt?: Date
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          role?: 'USER' | 'ADMIN' | 'MODERATOR'
          emailVerified?: Date | null
          password?: string | null
          image?: string | null
          phone?: string | null
          bio?: string | null
          isActive?: boolean
          client_id?: string | null
          createdAt?: Date
          updatedAt?: Date
        }
      }
      trading_accounts: {
        Row: {
          id: string
          userId: string
          balance: number
          availableMargin: number
          usedMargin: number
          client_id: string | null
          createdAt: Date
          updatedAt: Date
        }
        Insert: {
          id?: string
          userId: string
          balance?: number
          availableMargin?: number
          usedMargin?: number
          client_id?: string | null
          createdAt?: Date
          updatedAt?: Date
        }
        Update: {
          id?: string
          userId?: string
          balance?: number
          availableMargin?: number
          usedMargin?: number
          client_id?: string | null
          createdAt?: Date
          updatedAt?: Date
        }
      }
      positions: {
        Row: {
          id: string
          tradingAccountId: string
          symbol: string
          quantity: number
          averagePrice: number
          unrealizedPnL: number
          dayPnL: number
          stopLoss: number | null
          target: number | null
          createdAt: Date
          stockId: string | null
          segment: string
          productType: string
        }
        Insert: {
          id?: string
          tradingAccountId: string
          symbol: string
          quantity: number
          averagePrice: number
          unrealizedPnL?: number
          dayPnL?: number
          stopLoss?: number | null
          target?: number | null
          createdAt?: Date
          stockId?: string | null
          segment?: string
          productType?: string
        }
        Update: {
          id?: string
          tradingAccountId?: string
          symbol?: string
          quantity?: number
          averagePrice?: number
          unrealizedPnL?: number
          dayPnL?: number
          stopLoss?: number | null
          target?: number | null
          createdAt?: Date
          stockId?: string | null
          segment?: string
          productType?: string
        }
      }
      orders: {
        Row: {
          id: string
          tradingAccountId: string
          symbol: string
          quantity: number
          orderType: 'MARKET' | 'LIMIT'
          orderSide: 'BUY' | 'SELL'
          price: number | null
          filledQuantity: number
          averagePrice: number | null
          productType: string
          status: 'PENDING' | 'EXECUTED' | 'CANCELLED'
          createdAt: Date
          executedAt: Date | null
          stockId: string | null
          positionId: string | null
        }
        Insert: {
          id?: string
          tradingAccountId: string
          symbol: string
          quantity: number
          orderType: 'MARKET' | 'LIMIT'
          orderSide: 'BUY' | 'SELL'
          price?: number | null
          filledQuantity?: number
          averagePrice?: number | null
          productType?: string
          status?: 'PENDING' | 'EXECUTED' | 'CANCELLED'
          createdAt?: Date
          executedAt?: Date | null
          stockId?: string | null
          positionId?: string | null
        }
        Update: {
          id?: string
          tradingAccountId?: string
          symbol?: string
          quantity?: number
          orderType?: 'MARKET' | 'LIMIT'
          orderSide?: 'BUY' | 'SELL'
          price?: number | null
          filledQuantity?: number
          averagePrice?: number | null
          productType?: string
          status?: 'PENDING' | 'EXECUTED' | 'CANCELLED'
          createdAt?: Date
          executedAt?: Date | null
          stockId?: string | null
          positionId?: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          tradingAccountId: string
          amount: number
          type: 'CREDIT' | 'DEBIT' | 'MARGIN'
          description: string | null
          createdAt: Date
        }
        Insert: {
          id?: string
          tradingAccountId: string
          amount: number
          type: 'CREDIT' | 'DEBIT' | 'MARGIN'
          description?: string | null
          createdAt?: Date
        }
        Update: {
          id?: string
          tradingAccountId?: string
          amount?: number
          type?: 'CREDIT' | 'DEBIT' | 'MARGIN'
          description?: string | null
          createdAt?: Date
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
