/**
 * @file search-client.ts
 * @description Market data search API client for instrument discovery
 * 
 * PURPOSE:
 * - Search for equities, futures, options, and MCX commodities
 * - Call external market data API directly from frontend
 * - Handle authentication, errors, and response parsing
 * - Support all instrument types with proper typing
 * 
 * USAGE:
 * import { searchEquities, searchFutures } from '@/lib/services/market-data/search-client';
 * 
 * const results = await searchEquities('RELIANCE');
 * 
 * @author Trading Platform Team
 * @date 2025-01-28
 */

import { config } from '@/lib/config/runtime';

// Base API URL
const BASE_URL = process.env.NEXT_PUBLIC_MARKET_DATA_API_URL || 'https://marketdata.vedpragya.com';
const API_KEY = process.env.NEXT_PUBLIC_MARKET_DATA_API_KEY || 'demo-key-1';

// Search result types
export interface Instrument {
  token: number;
  symbol: string;
  name: string;
  exchange: string;
  segment: string;
  last_price?: number;
  expiry_date?: string; // For F&O
  strike_price?: number; // For options
  option_type?: 'CE' | 'PE'; // For options
  lot_size?: number;
  [key: string]: any; // Allow additional fields
}

export interface SearchResponse {
  success: boolean;
  data: {
    instruments: Instrument[];
    pagination?: {
      total: number;
      hasMore: boolean;
    };
  };
}

/**
 * Error class for search API errors
 */
export class SearchAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'SearchAPIError';
  }
}

/**
 * Make authenticated request to market data API
 */
async function apiRequest<T>(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  console.log('🔍 [SEARCH-CLIENT] Making request', { endpoint, params });
  
  try {
    // Build URL with query parameters
    const url = new URL(`${BASE_URL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
    
    // Make request with API key
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY || '',
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📡 [SEARCH-CLIENT] Response status', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new SearchAPIError(
        errorData.error || 'Search request failed',
        response.status,
        errorData
      );
    }
    
    const data = await response.json();
    console.log('✅ [SEARCH-CLIENT] Request successful', {
      count: data.data?.instruments?.length || 0,
    });
    
    return data;
  } catch (error) {
    console.error('❌ [SEARCH-CLIENT] Request failed', error);
    
    if (error instanceof SearchAPIError) {
      throw error;
    }
    
    throw new SearchAPIError(
      'Network error occurred',
      0,
      { originalError: error }
    );
  }
}

/**
 * Search for equity stocks
 * 
 * @param query - Search query (case-insensitive)
 * @param limit - Maximum results to return
 * @returns Search results
 */
export async function searchEquities(
  query: string,
  limit: number = 20
): Promise<Instrument[]> {
  try {
    console.log('📊 [SEARCH-CLIENT] Searching equities', { query, limit });
    
    const response = await apiRequest<SearchResponse>(
      '/api/stock/vayu/equities',
      { q: query, limit }
    );
    
    return response.data?.instruments || [];
  } catch (error) {
    console.error('❌ [SEARCH-CLIENT] Equities search failed', error);
    throw error;
  }
}

/**
 * Search for futures
 * 
 * @param query - Search query (case-insensitive)
 * @param limit - Maximum results to return
 * @returns Search results
 */
export async function searchFutures(
  query: string,
  limit: number = 20
): Promise<Instrument[]> {
  try {
    console.log('📊 [SEARCH-CLIENT] Searching futures', { query, limit });
    
    const response = await apiRequest<SearchResponse>(
      '/api/stock/vayu/futures',
      { q: query, limit }
    );
    
    return response.data?.instruments || [];
  } catch (error) {
    console.error('❌ [SEARCH-CLIENT] Futures search failed', error);
    throw error;
  }
}

/**
 * Search for options
 * 
 * @param query - Search query (case-insensitive)
 * @param optionType - CE or PE
 * @param limit - Maximum results to return
 * @returns Search results
 */
export async function searchOptions(
  query: string,
  optionType?: 'CE' | 'PE',
  limit: number = 20
): Promise<Instrument[]> {
  try {
    console.log('📊 [SEARCH-CLIENT] Searching options', { query, optionType, limit });
    
    const params: Record<string, string | number> = { q: query, limit };
    if (optionType) {
      params.option_type = optionType;
    }
    
    const response = await apiRequest<SearchResponse>(
      '/api/stock/vayu/options',
      params
    );
    
    return response.data?.instruments || [];
  } catch (error) {
    console.error('❌ [SEARCH-CLIENT] Options search failed', error);
    throw error;
  }
}

/**
 * Search for MCX commodities
 * 
 * @param query - Search query (case-insensitive)
 * @param limit - Maximum results to return
 * @returns Search results
 */
export async function searchCommodities(
  query: string,
  limit: number = 20
): Promise<Instrument[]> {
  try {
    console.log('📊 [SEARCH-CLIENT] Searching commodities', { query, limit });
    
    const response = await apiRequest<SearchResponse>(
      '/api/stock/vayu/commodities',
      { q: query, limit }
    );
    
    return response.data?.instruments || [];
  } catch (error) {
    console.error('❌ [SEARCH-CLIENT] Commodities search failed', error);
    throw error;
  }
}

/**
 * Search across all instrument types
 * 
 * @param query - Search query (case-insensitive)
 * @param limit - Maximum results per type
 * @returns Search results grouped by type
 */
export async function searchAll(
  query: string,
  limit: number = 20
): Promise<{
  equities: Instrument[];
  futures: Instrument[];
  options: Instrument[];
  commodities: Instrument[];
}> {
  console.log('📊 [SEARCH-CLIENT] Searching all instrument types', { query, limit });
  
  try {
    const [equities, futures, options, commodities] = await Promise.all([
      searchEquities(query, limit).catch(() => []),
      searchFutures(query, limit).catch(() => []),
      searchOptions(query, undefined, limit).catch(() => []),
      searchCommodities(query, limit).catch(() => []),
    ]);
    
    console.log('✅ [SEARCH-CLIENT] Search complete', {
      equities: equities.length,
      futures: futures.length,
      options: options.length,
      commodities: commodities.length,
    });
    
    return { equities, futures, options, commodities };
  } catch (error) {
    console.error('❌ [SEARCH-CLIENT] All search failed', error);
    throw error;
  }
}

/**
 * Get instrument by token (for quick lookup)
 * Currently not available in API, but placeholder for future
 */
export async function getInstrumentByToken(
  token: number
): Promise<Instrument | null> {
  console.warn('⚠️ [SEARCH-CLIENT] getInstrumentByToken not yet implemented');
  return null;
}
