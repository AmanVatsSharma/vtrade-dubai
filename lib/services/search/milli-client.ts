/**
 * @file milli-client.ts
 * @module services/search
 * @description Client for milli-search external API (suggest/search/filters/SSE/telemetry)
 * @author BharatERP
 * @created 2025-10-31
 */

import axios, { AxiosInstance, AxiosError } from 'axios'

// Base URL for external marketdata API (public, no secret)
const BASE_URL = (process.env.NEXT_PUBLIC_MARKETDATA_BASE_URL || 'https://marketdata.vedpragya.com').replace(/\/$/, '')

// Axios instance
const http: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/search`,
  timeout: 10000,
  withCredentials: false
})

// ---- Debug helpers & interceptors ----
function formatAxiosError(error: any) {
  const isAxios = !!(error as any)?.isAxiosError
  const ae = error as AxiosError
  return {
    isAxios,
    message: error?.message,
    code: ae?.code,
    url: (ae?.config?.baseURL || '') + (ae?.config?.url || ''),
    method: ae?.config?.method,
    params: ae?.config?.params,
    hasResponse: !!ae?.response,
    status: ae?.response?.status,
    statusText: ae?.response?.statusText,
    corsLikely:
      typeof window !== 'undefined' && !ae?.response && !!ae?.request,
  }
}

http.interceptors.request.use((config) => {
  try {
    // Avoid logging secrets; only log path and params
    console.log('🔎 [MILLI-CLIENT][REQ]', {
      url: (config.baseURL || '') + (config.url || ''),
      method: config.method,
      params: config.params,
    })
  } catch {}
  return config
})

http.interceptors.response.use(
  (response) => {
    try {
      console.log('✅ [MILLI-CLIENT][RES]', {
        url: (response.config.baseURL || '') + (response.config.url || ''),
        status: response.status,
      })
    } catch {}
    return response
  },
  (error) => {
    try {
      const info = formatAxiosError(error)
      console.error('❌ [MILLI-CLIENT][ERR]', info)
      if (info.corsLikely) {
        console.error('⚠️ [MILLI-CLIENT] Possible CORS issue: Missing Access-Control-Allow-Origin on external API')
      }
    } catch {}
    return Promise.reject(error)
  }
)

export type MilliMode = 'eq' | 'fno' | 'curr' | 'commodities'

export interface MilliInstrument {
  instrumentToken?: number
  token?: number
  symbol: string
  tradingSymbol?: string
  companyName?: string
  name?: string
  exchange: string
  segment: string
  instrumentType?: string
  expiryDate?: string
  expiry?: string
  strike?: number
  strike_price?: number
  optionType?: 'CE' | 'PE'
  option_type?: 'CE' | 'PE'
  lotSize?: number
  lot_size?: number
  last_price?: number
  vortexExchange?: string
  ticker?: string
  underlyingSymbol?: string
  isDerivative?: boolean
  [key: string]: any
}

export interface MilliSearchParams {
  q: string
  limit?: number
  exchange?: string
  segment?: string
  instrumentType?: string
  mode?: MilliMode
  expiry_from?: string
  expiry_to?: string
  strike_min?: number
  strike_max?: number
  ltp_only?: boolean
}

export interface MilliSuggestParams extends Pick<MilliSearchParams, 'q' | 'limit' | 'mode' | 'ltp_only'> {}

export interface MilliFiltersParams extends Omit<MilliSearchParams, 'limit'> {}

type MilliResponse<T> = {
  success?: boolean
  data?: T
  items?: T extends any[] ? T : never
}

function normalizeItem(item: MilliInstrument): MilliInstrument {
  // Provide common aliases for UI consumption
  const token = item.token ?? item.instrumentToken
  const expiry = item.expiry ?? item.expiryDate
  const strike_price = item.strike_price ?? item.strike
  const option_type = item.option_type ?? item.optionType
  const lot_size = item.lot_size ?? item.lotSize
  const name = item.name ?? item.companyName ?? item.symbol
  return {
    ...item,
    token,
    instrumentToken: token,
    expiry,
    expiryDate: expiry,
    strike_price,
    strike: strike_price,
    option_type,
    optionType: option_type,
    lot_size,
    lotSize: lot_size,
    name
  }
}

function withDefaults<T extends MilliSearchParams | MilliSuggestParams>(params: T): Record<string, string | number | boolean> {
  const p: Record<string, string | number | boolean> = {}
  // Only include supported query params (omit vortexExchange entirely)
  if (params.q) p.q = params.q
  if (params.limit !== undefined) p.limit = params.limit
  if ('mode' in params && params.mode) p.mode = params.mode
  if ('exchange' in params && params.exchange) p.exchange = params.exchange as string
  if ('segment' in params && params.segment) p.segment = params.segment as string
  if ('instrumentType' in params && params.instrumentType) p.instrumentType = params.instrumentType as string
  if ('expiry_from' in params && params.expiry_from) p.expiry_from = params.expiry_from as string
  if ('expiry_to' in params && params.expiry_to) p.expiry_to = params.expiry_to as string
  if ('strike_min' in params && params.strike_min !== undefined) p.strike_min = params.strike_min as number
  if ('strike_max' in params && params.strike_max !== undefined) p.strike_max = params.strike_max as number
  p.ltp_only = params.ltp_only ?? true
  return p
}

export async function suggest(params: MilliSuggestParams): Promise<MilliInstrument[]> {
  try {
    const qp = withDefaults(params)
    const res = await http.get<MilliResponse<{ instruments?: MilliInstrument[] } | MilliInstrument[]>>('/suggest', { params: qp })
    const payload: any = res.data
    const list: MilliInstrument[] = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data?.instruments)
        ? payload.data.instruments
        : Array.isArray(payload?.data)
          ? payload.data
          : []
    if (!list || list.length === 0) return []
    return list.map(normalizeItem)
  } catch (error) {
    const info = formatAxiosError(error)
    console.error('❌ [MILLI-CLIENT][SUGGEST] Failed', info)
    if (info.corsLikely) {
      console.error('⚠️ [MILLI-CLIENT][SUGGEST] CORS: Verify Access-Control-Allow-Origin on', BASE_URL)
    }
    throw error
  }
}

export async function search(params: MilliSearchParams): Promise<MilliInstrument[]> {
  try {
    const qp = withDefaults(params)
    const res = await http.get<MilliResponse<{ instruments?: MilliInstrument[] } | MilliInstrument[]>>('', { params: qp })
    const payload: any = res.data
    const list: MilliInstrument[] = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data?.instruments)
        ? payload.data.instruments
        : Array.isArray(payload?.data)
          ? payload.data
          : []
    if (!list || list.length === 0) return []
    return list.map(normalizeItem)
  } catch (error) {
    const info = formatAxiosError(error)
    console.error('❌ [MILLI-CLIENT][SEARCH] Failed', info)
    if (info.corsLikely) {
      console.error('⚠️ [MILLI-CLIENT][SEARCH] CORS: Verify Access-Control-Allow-Origin on', BASE_URL)
    }
    throw error
  }
}

export async function filters(params: MilliFiltersParams): Promise<any> {
  try {
    const qp = withDefaults(params as MilliSearchParams)
    const res = await http.get<MilliResponse<any>>('/filters', { params: qp })
    return res.data?.data ?? res.data ?? {}
  } catch (error) {
    const info = formatAxiosError(error)
    console.error('❌ [MILLI-CLIENT][FILTERS] Failed', info)
    if (info.corsLikely) {
      console.error('⚠️ [MILLI-CLIENT][FILTERS] CORS: Verify Access-Control-Allow-Origin on', BASE_URL)
    }
    throw error
  }
}

export async function telemetrySelection(body: { q: string; symbol: string; instrumentToken?: number | string }): Promise<void> {
  try {
    await http.post('/telemetry/selection', body)
  } catch {
    // best-effort, ignore
  }
}

export function buildStreamURL(params: { tokens?: Array<number | string> | string; q?: string; ltp_only?: boolean; limit?: number }): string {
  const url = new URL(`${BASE_URL}/api/search/stream`)
  if (params.tokens) {
    const tokens = Array.isArray(params.tokens) ? params.tokens.join(',') : String(params.tokens)
    url.searchParams.set('tokens', tokens)
  }
  if (params.q) url.searchParams.set('q', params.q)
  if (params.limit) url.searchParams.set('limit', String(params.limit))
  url.searchParams.set('ltp_only', String(params.ltp_only ?? true))
  try {
    console.log('🔗 [MILLI-CLIENT][SSE-URL]', url.toString())
  } catch {}
  return url.toString()
}

export const milliClient = {
  suggest,
  search,
  filters,
  telemetrySelection,
  buildStreamURL
}


