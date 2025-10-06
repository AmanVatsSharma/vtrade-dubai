// lib/vortex-enhanced.ts
import axios, { AxiosError, AxiosResponse } from 'axios';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { logger, LogCategory } from './vortexLogger';
import { requestQueue } from './request-queue';

export interface VortexConfig {
  applicationId: string;
  apiKey: string;
  baseUrl: string;
}

export interface VortexSession {
  id: number;
  userId: number;
  accessToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VortexQuote {
  instrument: string;
  ltp?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  change?: number;
  changePercent?: number;
  lastTradeTime?: string;
}

export interface VortexError {
  code: string;
  message: string;
  details?: any;
}

export class VortexAPIError extends Error {
  public code: string;
  public details?: any;
  public statusCode?: number;

  constructor(message: string, code: string, details?: any, statusCode?: number) {
    super(message);
    this.name = 'VortexAPIError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }
}

export class VortexAPI {
  private config: VortexConfig;
  private currentSession: VortexSession | null = null;

  constructor() {
    this.config = {
      applicationId: process.env.VORTEX_APPLICATION_ID || process.env.NEXT_PUBLIC_VORTEX_APPLICATION_ID || '',
      apiKey: process.env.VORTEX_X_API_KEY || '',
      baseUrl: 'https://vortex-api.rupeezy.in/v2'
    };

    if (!this.config.applicationId || !this.config.apiKey) {
      logger.critical(LogCategory.VORTEX_API, 'Vortex configuration missing', undefined, {
        hasAppId: !!this.config.applicationId,
        hasApiKey: !!this.config.apiKey
      });
      throw new VortexAPIError(
        'Vortex API configuration is incomplete',
        'CONFIG_ERROR',
        { missing: { applicationId: !this.config.applicationId, apiKey: !this.config.apiKey } }
      );
    }

    logger.info(LogCategory.VORTEX_API, 'Vortex API client initialized', {
      applicationId: this.config.applicationId,
      baseUrl: this.config.baseUrl
    });
  }

  // Generate checksum for authentication
  private generateChecksum(authToken: string): string {
    const raw = this.config.applicationId + authToken + this.config.apiKey;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  // Get current active session
  public async getCurrentSession(): Promise<VortexSession | null> {
    try {
      const session = await prisma.vortexSession.findFirst({
        orderBy: { createdAt: 'desc' }
      });

      if (session) {
        this.currentSession = session;
        logger.info(LogCategory.VORTEX_AUTH, 'Retrieved current session', {
          sessionId: session.id,
          userId: session.userId,
          createdAt: session.createdAt
        });
      }

      return session;
    } catch (error) {
      logger.error(LogCategory.DATABASE, 'Failed to retrieve current session', error as Error);
      throw new VortexAPIError('Failed to retrieve session', 'SESSION_ERROR', error);
    }
  }

  // Exchange auth token for access token
  public async exchangeToken(authToken: string, userId: number = 1): Promise<VortexSession> {
    try {
      logger.info(LogCategory.VORTEX_AUTH, 'Starting token exchange', { userId, authToken: authToken.substring(0, 10) + '...' });

      const checksum = this.generateChecksum(authToken);
      
      const response = await axios.post(`${this.config.baseUrl}/user/session`, {
        checksum,
        applicationId: this.config.applicationId,
        token: authToken
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey
        },
        timeout: 10000 // 10 second timeout
      });

      logger.info(LogCategory.VORTEX_AUTH, 'Token exchange response received', {
        status: response.status,
        hasAccessToken: !!response.data?.data?.access_token,
        responseStatus: response.data?.status
      });

      if (response.data.status === 'success' && response.data.data?.access_token) {
        // Save session to database
        const session = await prisma.vortexSession.create({
          data: {
            userId,
            accessToken: response.data.data.access_token
          }
        });

        this.currentSession = session;
        
        logger.info(LogCategory.VORTEX_AUTH, 'Session created successfully', {
          sessionId: session.id,
          userId: session.userId,
          userName: response.data.data.user_name,
          email: response.data.data.email,
          exchanges: response.data.data.exchanges,
          tradingActive: response.data.data.tradingActive
        });

        return session;
      } else {
        // Log detailed failure response for debugging
        logger.error(LogCategory.VORTEX_AUTH, 'Token exchange failed - Invalid response', undefined, {
          httpStatus: response.status,
          responseStatus: response.data?.status,
          fullResponse: response.data,
          hasData: !!response.data?.data,
          hasAccessToken: !!response.data?.data?.access_token,
          errorMessage: response.data?.message || response.data?.error || 'Unknown error',
          requestData: {
            applicationId: this.config.applicationId,
            hasToken: !!authToken,
            tokenLength: authToken.length
          }
        });

        throw new VortexAPIError(
          `Token exchange failed: ${response.data?.message || response.data?.error || 'Invalid response'}`,
          'TOKEN_EXCHANGE_FAILED',
          {
            httpStatus: response.status,
            responseStatus: response.data?.status,
            fullResponse: response.data,
            errorMessage: response.data?.message || response.data?.error
          }
        );
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        logger.error(LogCategory.VORTEX_AUTH, 'Token exchange failed', error, {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data
        });
        
        throw new VortexAPIError(
          'Token exchange failed',
          'TOKEN_EXCHANGE_FAILED',
          {
            status: axiosError.response?.status,
            data: axiosError.response?.data
          },
          axiosError.response?.status
        );
      }
      
      logger.error(LogCategory.VORTEX_AUTH, 'Unexpected error during token exchange', error as Error);
      throw new VortexAPIError('Unexpected error during token exchange', 'UNEXPECTED_ERROR', error);
    }
  }

  // Ensure we have a valid session
  private async ensureValidSession(): Promise<VortexSession> {
    if (!this.currentSession) {
      this.currentSession = await this.getCurrentSession();
    }

    if (!this.currentSession) {
      throw new VortexAPIError('No active session found', 'NO_SESSION');
    }

    return this.currentSession;
  }

  // Get API headers with authentication
  private async getHeaders(): Promise<Record<string, string>> {
    const session = await this.ensureValidSession();
    
    return {
      'Authorization': `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'Accept': 'application/json'
    };
  }

  // Make authenticated API request with rate limiting
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    params?: Record<string, any>,
    priority: number = 0
  ): Promise<T> {
    return requestQueue.addRequest(async () => {
      try {
        const headers = await this.getHeaders();
        const url = `${this.config.baseUrl}${endpoint}`;
        
        logger.debug(LogCategory.VORTEX_API, 'Making API request', {
          method,
          url,
          hasData: !!data,
          hasParams: !!params,
          priority
        });

        const response: AxiosResponse<T> = await axios({
          method,
          url,
          headers,
          data,
          params,
          timeout: 15000 // 15 second timeout
        });

        logger.info(LogCategory.VORTEX_API, 'API request successful', {
          method,
          endpoint,
          status: response.status
        });

        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          
          // Check for rate limit errors
          if (axiosError.response?.status === 429) {
            logger.warn(LogCategory.VORTEX_API, 'Rate limit exceeded, request will be retried', {
              method,
              endpoint,
              retryAfter: axiosError.response.headers['retry-after']
            });
            
            // Wait longer before retrying
            await new Promise(resolve => setTimeout(resolve, 5000));
            throw new VortexAPIError(
              'Rate limit exceeded, please try again later',
              'RATE_LIMIT_EXCEEDED',
              {
                method,
                endpoint,
                retryAfter: axiosError.response.headers['retry-after']
              },
              429
            );
          }

          logger.error(LogCategory.VORTEX_API, 'API request failed', error, {
            method,
            endpoint,
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: axiosError.response?.data
          });

          throw new VortexAPIError(
            `API request failed: ${axiosError.message}`,
            'API_REQUEST_FAILED',
            {
              method,
              endpoint,
              status: axiosError.response?.status,
              data: axiosError.response?.data
            },
            axiosError.response?.status
          );
        }

        logger.error(LogCategory.VORTEX_API, 'Unexpected error during API request', error as Error, {
          method,
          endpoint
        });

        throw new VortexAPIError('Unexpected error during API request', 'UNEXPECTED_ERROR', error);
      }
    }, priority, `${method}_${endpoint}_${Date.now()}`);
  }

  // Get quotes for instruments
  public async getQuotes(instruments: string[], mode: string = 'ltp'): Promise<Record<string, VortexQuote>> {
    try {
      logger.info(LogCategory.VORTEX_QUOTES, 'Fetching quotes', {
        instruments: instruments.length,
        mode,
        instrumentsList: instruments
      });

      const queryString = instruments.map(inst => `q=${encodeURIComponent(inst)}`).join('&');
      const endpoint = `/data/quotes?${queryString}&mode=${mode}`;

      // High priority for quotes requests
      const data = await this.makeRequest<Record<string, VortexQuote>>('GET', endpoint, undefined, undefined, 10);

      logger.info(LogCategory.VORTEX_QUOTES, 'Quotes fetched successfully', {
        instrumentCount: Object.keys(data).length
      });

      return data;
    } catch (error) {
      logger.error(LogCategory.VORTEX_QUOTES, 'Failed to fetch quotes', error as Error, {
        instruments,
        mode
      });
      throw error;
    }
  }

  // Get user profile
  public async getUserProfile(): Promise<any> {
    try {
      logger.info(LogCategory.VORTEX_API, 'Fetching user profile');
      
      const data = await this.makeRequest<any>('GET', '/user/profile');
      
      logger.info(LogCategory.VORTEX_API, 'User profile fetched successfully');
      
      return data;
    } catch (error) {
      logger.error(LogCategory.VORTEX_API, 'Failed to fetch user profile', error as Error);
      throw error;
    }
  }

  // Get user positions
  public async getPositions(): Promise<any> {
    try {
      logger.info(LogCategory.VORTEX_POSITIONS, 'Fetching user positions');
      
      const data = await this.makeRequest<any>('GET', '/user/positions');
      
      logger.info(LogCategory.VORTEX_POSITIONS, 'Positions fetched successfully', {
        positionCount: Array.isArray(data) ? data.length : 'unknown'
      });
      
      return data;
    } catch (error) {
      logger.error(LogCategory.VORTEX_POSITIONS, 'Failed to fetch positions', error as Error);
      throw error;
    }
  }

  // Get user orders
  public async getOrders(): Promise<any> {
    try {
      logger.info(LogCategory.VORTEX_ORDERS, 'Fetching user orders');
      
      const data = await this.makeRequest<any>('GET', '/user/orders');
      
      logger.info(LogCategory.VORTEX_ORDERS, 'Orders fetched successfully', {
        orderCount: Array.isArray(data) ? data.length : 'unknown'
      });
      
      return data;
    } catch (error) {
      logger.error(LogCategory.VORTEX_ORDERS, 'Failed to fetch orders', error as Error);
      throw error;
    }
  }

  // Get user funds
  public async getFunds(): Promise<any> {
    try {
      logger.info(LogCategory.VORTEX_API, 'Fetching user funds');
      
      const data = await this.makeRequest<any>('GET', '/user/funds');
      
      logger.info(LogCategory.VORTEX_API, 'Funds fetched successfully');
      
      return data;
    } catch (error) {
      logger.error(LogCategory.VORTEX_API, 'Failed to fetch funds', error as Error);
      throw error;
    }
  }

  // Search instruments
  public async searchInstruments(query: string, exchange?: string): Promise<any> {
    try {
      logger.info(LogCategory.VORTEX_API, 'Searching instruments', { query, exchange });
      
      const params: Record<string, any> = { q: query };
      if (exchange) params.exchange = exchange;
      
      const data = await this.makeRequest<any>('GET', '/search/instruments', undefined, params);
      
      logger.info(LogCategory.VORTEX_API, 'Instruments search completed', {
        query,
        resultCount: Array.isArray(data) ? data.length : 'unknown'
      });
      
      return data;
    } catch (error) {
      logger.error(LogCategory.VORTEX_API, 'Failed to search instruments', error as Error, { query, exchange });
      throw error;
    }
  }

  // Clear current session
  public clearSession(): void {
    this.currentSession = null;
    logger.info(LogCategory.VORTEX_AUTH, 'Session cleared');
  }

  // Check if session is valid
  public async isSessionValid(): Promise<boolean> {
    try {
      await this.ensureValidSession();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Test Vortex API connection with detailed logging
  public async testConnection(): Promise<{ success: boolean; details: any }> {
    try {
      logger.info(LogCategory.VORTEX_API, 'Testing Vortex API connection');
      
      const session = await this.ensureValidSession();
      
      // Test with a simple API call (user profile)
      const profile = await this.getUserProfile();
      
      logger.info(LogCategory.VORTEX_API, 'Vortex API connection test successful', {
        sessionId: session.id,
        hasProfile: !!profile
      });
      
      return {
        success: true,
        details: {
          sessionId: session.id,
          profile,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error(LogCategory.VORTEX_API, 'Vortex API connection test failed', error as Error, {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // Get detailed session information
  public async getSessionInfo(): Promise<any> {
    try {
      const session = await this.ensureValidSession();
      
      // Try to get user profile to validate session
      const profile = await this.getUserProfile();
      
      return {
        sessionId: session.id,
        userId: session.userId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        accessToken: session.accessToken,
        profile,
        isValid: true
      };
    } catch (error) {
      logger.error(LogCategory.VORTEX_AUTH, 'Failed to get session info', error as Error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const vortexAPI = new VortexAPI();
export default vortexAPI;
