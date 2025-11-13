/**
 * @file use-instrument-search.ts
 * @description React hook for instrument search with debouncing and tab filtering
 * 
 * PURPOSE:
 * - Debounced search across all instrument types
 * - Tab-based filtering (equity, futures, options, mcx)
 * - State management for search results and loading
 * - Error handling and retry logic
 * 
 * USAGE:
 * const { results, loading, error, search } = useInstrumentSearch({
 *   activeTab: 'equity',
 *   debounceMs: 300
 * });
 * 
 * search('RELIANCE');
 * 
 * @author Trading Platform Team
 * @date 2025-01-28
 */

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  milliClient,
  type MilliInstrument,
  type MilliMode,
} from '@/lib/services/search/milli-client';
import type { Instrument } from '@/lib/services/market-data/search-client'
import { searchEquities, searchFutures, searchOptions, searchCommodities } from '@/lib/services/market-data/search-client'

// Configurable default exchange for Equity tab
const DEFAULT_EQUITY_EXCHANGE = process.env.NEXT_PUBLIC_DEFAULT_EQUITY_EXCHANGE || 'NSE_EQ'
// Configurable default exchange for MCX tab
const DEFAULT_MCX_EXCHANGE = process.env.NEXT_PUBLIC_DEFAULT_MCX_EXCHANGE || 'MCX_FO'

export type SearchTab = 'equity' | 'futures' | 'options' | 'commodities';

export interface UseInstrumentSearchOptions {
  activeTab?: SearchTab;
  debounceMs?: number;
}

export interface UseInstrumentSearchReturn {
  // State
  results: MilliInstrument[];
  loading: boolean;
  error: string | null;
  
  // Actions
  search: (query: string) => void;
  clear: () => void;
  
  // Utilities
  hasResults: boolean;
  resultCount: number;
}

/**
 * Hook for instrument search with debouncing
 */
export function useInstrumentSearch(
  options: UseInstrumentSearchOptions = {}
): UseInstrumentSearchReturn {
  const {
    activeTab = 'equity',
    debounceMs = 300,
  } = options;

  const [results, setResults] = useState<MilliInstrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSearchRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTabRef = useRef<SearchTab>(activeTab);
  const requestIdRef = useRef<number>(0);
  const lastSuccessfulResultsRef = useRef<MilliInstrument[]>([]);
  const tabChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sseQuery, setSseQuery] = useState<string>('');
  const [sseTab, setSseTab] = useState<SearchTab>(activeTab);
  
  // keep ref in sync
  useEffect(() => {
    activeTabRef.current = activeTab;
    setSseTab(activeTab); // Update SSE tab state for effect dependency
  }, [activeTab]);

  /**
   * Perform search based on active tab
   */
  const performSearch = useCallback(async (
    query: string,
    tab: SearchTab
  ) => {
    // Generate unique request ID for deduplication
    const currentRequestId = ++requestIdRef.current;
    
    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      if (tab === 'equity') {
        // Use internal EQUITIES proxy (NSE_EQ)
        const url = `/api/market-data/equities?q=${encodeURIComponent(query)}&exchange=NSE_EQ&limit=20&ltp_only=true`;
        const res = await fetch(url, { method: 'GET', cache: 'no-store', signal: abortControllerRef.current?.signal });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`Equities search failed (${res.status}): ${errText || res.statusText}`);
        }
        const data = await res.json();
        const items: any[] = data?.data?.instruments || [];
        const mapped: MilliInstrument[] = items.map((inst: any) => ({
          token: Number(inst?.token),
          instrumentToken: Number(inst?.token),
          symbol: String(inst?.symbol || ''),
          tradingSymbol: String(inst?.symbol || ''),
          companyName: String(inst?.symbol || ''),
          exchange: 'NSE_EQ',
          segment: 'NSE',
          instrumentType: 'EQUITY',
          description: inst?.description,
          last_price: inst?.last_price != null ? Number(inst.last_price) : undefined,
          is_active: inst?.is_active,
        } as any));
        // Only update if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setResults(mapped);
          lastSuccessfulResultsRef.current = mapped;
          setLoading(false);
        }
        return;
      }
      if (tab === 'commodities') {
        // Use internal MCX proxy that forwards symbol query to Vedpragya
        const url = `/api/market-data/mcx?symbol=${encodeURIComponent(query)}&limit=20&offset=0&ltp_only=true&include_ltp=true`;
        const res = await fetch(url, { method: 'GET', cache: 'no-store', signal: abortControllerRef.current?.signal });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`MCX search failed (${res.status}): ${errText || res.statusText}`);
        }
        const data = await res.json();
        const items: any[] = data?.data?.instruments || [];
        const mapped: MilliInstrument[] = items.map((inst: any) => {
          // Normalize fields to common shape expected by UI
          const strikeVal = typeof inst?.strike_price === 'string' ? parseFloat(inst.strike_price) : inst?.strike_price;
          const lotVal = typeof inst?.lot_size === 'string' ? parseFloat(inst.lot_size) : inst?.lot_size;
          return {
            token: Number(inst?.token),
            instrumentToken: Number(inst?.token),
            symbol: String(inst?.symbol || ''),
            tradingSymbol: String(inst?.symbol || ''),
            companyName: String(inst?.symbol || ''),
            exchange: inst?.exchange || DEFAULT_MCX_EXCHANGE,
            segment: inst?.exchange || DEFAULT_MCX_EXCHANGE,
            instrumentType: 'FUTCOM',
            instrument_name: inst?.instrument_name,
            expiry_date: inst?.expiry_date,
            expiryDate: inst?.expiry_date,
            strike_price: isNaN(Number(strikeVal)) ? undefined : Number(strikeVal),
            strike: isNaN(Number(strikeVal)) ? undefined : Number(strikeVal),
            tick: inst?.tick ? Number(inst?.tick) : undefined,
            lot_size: isNaN(Number(lotVal)) ? undefined : Number(lotVal),
            lotSize: isNaN(Number(lotVal)) ? undefined : Number(lotVal),
            description: inst?.description,
            last_price: inst?.last_price != null ? Number(inst.last_price) : undefined,
            // add passthroughs
            is_active: inst?.is_active,
            option_type: inst?.option_type && inst?.option_type !== 'XX' ? inst.option_type : undefined,
          } as any;
        });
        // Only update if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setResults(mapped);
          lastSuccessfulResultsRef.current = mapped;
          setLoading(false);
        }
        return;
      }
      if (tab === 'futures') {
        // Use internal FUTURES proxy (NSE_FO FUTSTK)
        const url = `/api/market-data/futures?symbol=${encodeURIComponent(query)}&limit=20&offset=0&ltp_only=true&include_ltp=true`;
        const res = await fetch(url, { method: 'GET', cache: 'no-store', signal: abortControllerRef.current?.signal });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`Futures search failed (${res.status}): ${errText || res.statusText}`);
        }
        const data = await res.json();
        const items: any[] = data?.data?.instruments || [];
        const mapped: MilliInstrument[] = items.map((inst: any) => {
          const strikeVal = typeof inst?.strike_price === 'string' ? parseFloat(inst.strike_price) : inst?.strike_price;
          const lotVal = typeof inst?.lot_size === 'string' ? parseFloat(inst?.lot_size) : inst?.lot_size;
          return {
            token: Number(inst?.token),
            instrumentToken: Number(inst?.token),
            symbol: String(inst?.symbol || ''),
            tradingSymbol: String(inst?.symbol || ''),
            companyName: String(inst?.symbol || ''),
            exchange: 'NSE_FO',
            segment: 'NSE_FO',
            instrumentType: 'FUTSTK',
            instrument_name: inst?.instrument_name,
            expiry_date: inst?.expiry_date,
            expiryDate: inst?.expiry_date,
            strike_price: isNaN(Number(strikeVal)) ? undefined : Number(strikeVal),
            strike: isNaN(Number(strikeVal)) ? undefined : Number(strikeVal),
            tick: inst?.tick ? Number(inst?.tick) : undefined,
            lot_size: isNaN(Number(lotVal)) ? undefined : Number(lotVal),
            lotSize: isNaN(Number(lotVal)) ? undefined : Number(lotVal),
            description: inst?.description,
            last_price: inst?.last_price != null ? Number(inst.last_price) : undefined,
            is_active: inst?.is_active,
            option_type: inst?.option_type && inst?.option_type !== 'XX' ? inst.option_type : undefined,
          } as any;
        });
        // Only update if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setResults(mapped);
          lastSuccessfulResultsRef.current = mapped;
          setLoading(false);
        }
        return;
      }

      // Non-MCX tabs → milli client (fast suggest + later refine)
      // At this point, tab can only be 'options' (equity, commodities, futures handled above)
      const mode: MilliMode = 'fno';
      const exchange = undefined;
      const searchResults = await milliClient.suggest({ q: query, mode, ltp_only: true, ...(exchange ? { exchange } : {}) });
      
      // Only update if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        setResults(searchResults);
        lastSuccessfulResultsRef.current = searchResults;
        setLoading(false);
      }

      // Schedule an idle follow-up full search to refine results (hybrid UX)
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
      const idleRequestId = currentRequestId
      idleTimerRef.current = setTimeout(async () => {
        // Ignore if query changed during idle or if a newer request started
        if (currentSearchRef.current !== query || idleRequestId !== requestIdRef.current) return
        try {
          // Skip refinement for equities (using proxy), commodities, and futures
          if ((tab as any) === 'equity' || (tab as any) === 'commodities' || (tab as any) === 'futures') return
          const fullResults = await milliClient.search({ q: query, mode, ltp_only: true, ...(exchange ? { exchange } : {}) })
          // Only update if still the latest request and query hasn't changed
          if (currentSearchRef.current === query && idleRequestId === requestIdRef.current && Array.isArray(fullResults) && fullResults.length > 0) {
            setResults(fullResults)
            lastSuccessfulResultsRef.current = fullResults
          }
        } catch {
          // ignore background refinement errors
        }
      }, Math.max(400, Math.min(600, debounceMs + 250)))
    } catch (err: any) {
      // Only handle error if this is still the latest request
      if (currentRequestId !== requestIdRef.current) return
      
      if (err instanceof Error) {
        // Don't clear results on abort (user cancelled)
        if (err.message.includes('aborted')) {
          setLoading(false)
          return
        }
        // On actual error, preserve last successful results instead of clearing
        setError(err.message)
        setLoading(false)
        // Only clear results if we have no previous successful results
        if (lastSuccessfulResultsRef.current.length === 0) {
          setResults([])
        } else {
          // Restore last successful results
          setResults(lastSuccessfulResultsRef.current)
        }
      } else {
        setLoading(false)
        if (lastSuccessfulResultsRef.current.length === 0) {
          setResults([])
        } else {
          setResults(lastSuccessfulResultsRef.current)
        }
      }
    }
  }, []);

  /**
   * Debounced search function
   */
  const search = useCallback((query: string) => {
    console.log('🔍 [USE-INSTRUMENT-SEARCH] Search called', { query, activeTab: activeTabRef.current });
    
    // Update current search
    currentSearchRef.current = query;
    setSseQuery(query); // Update SSE query state for effect dependency
    
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
    
    // If query is empty, clear immediately
    if (!query.trim()) {
      setResults([]);
      lastSuccessfulResultsRef.current = [];
      setSseQuery(''); // Clear SSE query
      setError(null);
      return;
    }
    
    // Set up debounced search - use activeTabRef.current instead of closure activeTab
    debounceTimer.current = setTimeout(() => {
      performSearch(query, activeTabRef.current);
    }, debounceMs);
  }, [debounceMs, performSearch]);

  /**
   * Clear search results
   */
  const clear = useCallback(() => {
    console.log('🧹 [USE-INSTRUMENT-SEARCH] Clearing results');
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
    
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (tabChangeTimerRef.current) {
        clearTimeout(tabChangeTimerRef.current);
      }
      
      setResults([]);
      lastSuccessfulResultsRef.current = [];
      setSseQuery(''); // Clear SSE query
      setError(null);
      setLoading(false);
      currentSearchRef.current = '';
  }, []);

  /**
   * Cancel on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
      if (tabChangeTimerRef.current) {
        clearTimeout(tabChangeTimerRef.current)
      }
    };
  }, []);

  /**
   * Re-search when tab changes (debounced to avoid race conditions)
   */
  useEffect(() => {
    // Clear any pending tab change search
    if (tabChangeTimerRef.current) {
      clearTimeout(tabChangeTimerRef.current);
    }
    
    if (currentSearchRef.current) {
      console.log('🔄 [USE-INSTRUMENT-SEARCH] Tab changed, scheduling re-search', {
        query: currentSearchRef.current,
        activeTab,
      });
      
      // Debounce tab change search to avoid race conditions
      tabChangeTimerRef.current = setTimeout(() => {
        // Cancel any pending debounced searches
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
          debounceTimer.current = null;
        }
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
          idleTimerRef.current = null;
        }
        
        // Only search if query still exists and tab hasn't changed again
        if (currentSearchRef.current && activeTabRef.current === activeTab) {
          performSearch(currentSearchRef.current, activeTabRef.current);
        }
      }, 300); // 300ms debounce for tab changes
    }
    
    return () => {
      if (tabChangeTimerRef.current) {
        clearTimeout(tabChangeTimerRef.current);
        tabChangeTimerRef.current = null;
      }
    };
  }, [activeTab, performSearch]);

  // SSE live LTP updates for current result set
  // Changed dependency from results to query+tab to avoid recreating EventSource on every result update
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Skip SSE streaming for commodities (MCX) tab for now
    if (sseTab === 'commodities') {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return
    }
    const q = sseQuery
    if (!q) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return
    }

    try {
      const url = milliClient.buildStreamURL({ q, ltp_only: true })
      // Only recreate EventSource if query or tab actually changed
      const currentUrl = eventSourceRef.current ? (eventSourceRef.current as any)._url : null
      if (currentUrl === url && eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN) {
        // EventSource already open for this query, don't recreate
        return
      }
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      
      const es = new EventSource(url)
      // Store URL for comparison
      ;(es as any)._url = url
      eventSourceRef.current = es

      es.onopen = () => {
        try { console.log('✅ [USE-INSTRUMENT-SEARCH][SSE] Opened', { url }) } catch {}
      }
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          const ltpMap: Record<string, number> = payload?.data || payload || {}
          if (!ltpMap || typeof ltpMap !== 'object') return
          // Use functional setState to update results without triggering SSE recreation
          setResults((prev: MilliInstrument[]) => {
            // Only update if we still have results (don't update if results were cleared)
            if (prev.length === 0) return prev
            return prev.map((item: any) => {
              const tokenKey = String(item.token ?? item.instrumentToken ?? '')
              const ltp = ltpMap[tokenKey]
              return ltp ? { ...item, last_price: ltp } : item
            })
          })
        } catch {}
      }

      es.onerror = (ev) => {
        try {
          console.error('❌ [USE-INSTRUMENT-SEARCH][SSE] Error', { url, readyState: es.readyState, event: ev })
        } catch {}
        es.close()
        if (eventSourceRef.current === es) {
          eventSourceRef.current = null
        }
      }
    } catch {
      // ignore SSE issues
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [sseQuery, sseTab]) // Depend on query and tab state, not results

  return {
    results,
    loading,
    error,
    search,
    clear,
    hasResults: results.length > 0,
    resultCount: results.length,
  };
}

/**
 * Hook for multi-tab search (returns results for all tabs)
 */
export function useMultiTabSearch(
  query: string,
  limit: number = 20
) {
  const [results, setResults] = useState<{
    equity: Instrument[];
    futures: Instrument[];
    options: Instrument[];
    commodities: Instrument[];
  }>({
    equity: [],
    futures: [],
    options: [],
    commodities: [],
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!query.trim()) {
      setResults({
        equity: [],
        futures: [],
        options: [],
        commodities: [],
      });
      return;
    }
    
    const performSearch = async () => {
      console.log('🔍 [USE-MULTI-TAB-SEARCH] Searching all tabs', { query });
      
      setLoading(true);
      setError(null);
      
      try {
        const [equity, futures, options, commodities] = await Promise.all([
          searchEquities(query, limit).catch(() => []),
          searchFutures(query, limit).catch(() => []),
          searchOptions(query, undefined, limit).catch(() => []),
          searchCommodities(query, limit).catch(() => []),
        ]);
        
        console.log('✅ [USE-MULTI-TAB-SEARCH] Search complete', {
          equity: equity.length,
          futures: futures.length,
          options: options.length,
          commodities: commodities.length,
        });
        
        setResults({ equity, futures, options, commodities });
        setLoading(false);
      } catch (err) {
        console.error('❌ [USE-MULTI-TAB-SEARCH] Search failed', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setLoading(false);
      }
    };
    
    const timer = setTimeout(performSearch, 300); // Debounce
    
    return () => clearTimeout(timer);
  }, [query, limit]);
  
  return { results, loading, error };
}
