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
  searchEquities,
  searchFutures,
  searchOptions,
  searchCommodities,
  type Instrument,
} from '@/lib/services/market-data/search-client';

export type SearchTab = 'equity' | 'futures' | 'options' | 'commodities';

export interface UseInstrumentSearchOptions {
  activeTab?: SearchTab;
  debounceMs?: number;
  limit?: number;
}

export interface UseInstrumentSearchReturn {
  // State
  results: Instrument[];
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
    limit = 20,
  } = options;

  const [results, setResults] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const currentSearchRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Perform search based on active tab
   */
  const performSearch = useCallback(async (
    query: string,
    tab: SearchTab
  ) => {
    console.log('🔍 [USE-INSTRUMENT-SEARCH] Performing search', { query, tab });
    
    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      let searchResults: Instrument[] = [];
      
      switch (tab) {
        case 'equity':
          searchResults = await searchEquities(query, limit);
          break;
        case 'futures':
          searchResults = await searchFutures(query, limit);
          break;
        case 'options':
          searchResults = await searchOptions(query, undefined, limit);
          break;
        case 'commodities':
          searchResults = await searchCommodities(query, limit);
          break;
      }
      
      console.log('✅ [USE-INSTRUMENT-SEARCH] Search successful', {
        tab,
        count: searchResults.length,
      });
      
      setResults(searchResults);
      setLoading(false);
    } catch (err) {
      console.error('❌ [USE-INSTRUMENT-SEARCH] Search failed', err);
      
      if (err instanceof Error && !err.message.includes('aborted')) {
        setError(err.message);
      }
      
      setLoading(false);
      setResults([]);
    }
  }, [limit]);

  /**
   * Debounced search function
   */
  const search = useCallback((query: string) => {
    console.log('🔍 [USE-INSTRUMENT-SEARCH] Search called', { query, activeTab });
    
    // Update current search
    currentSearchRef.current = query;
    
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // If query is empty, clear immediately
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    
    // Set up debounced search
    debounceTimer.current = setTimeout(() => {
      performSearch(query, activeTab);
    }, debounceMs);
  }, [activeTab, debounceMs, performSearch]);

  /**
   * Clear search results
   */
  const clear = useCallback(() => {
    console.log('🧹 [USE-INSTRUMENT-SEARCH] Clearing results');
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setResults([]);
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
    };
  }, []);

  /**
   * Re-search when tab changes
   */
  useEffect(() => {
    if (currentSearchRef.current) {
      console.log('🔄 [USE-INSTRUMENT-SEARCH] Tab changed, re-searching', {
        query: currentSearchRef.current,
        activeTab,
      });
      
      performSearch(currentSearchRef.current, activeTab);
    }
  }, [activeTab, performSearch]);

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
