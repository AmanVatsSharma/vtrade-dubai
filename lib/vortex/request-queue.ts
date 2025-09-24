// lib/request-queue.ts
import { logger, LogCategory } from './vortexLogger';

interface QueuedRequest {
  id: string;
  request: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  priority?: number;
}

class RequestQueue {  
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private readonly minInterval = 1000; // 1 second between requests
  private requestCount = 0;
  private readonly maxRequestsPerMinute = 30; // Conservative limit
  private requestTimes: number[] = [];

  constructor() {
    // Clean up old request times every minute
    setInterval(() => {
      const oneMinuteAgo = Date.now() - 60000;
      this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);
    }, 60000);
  }

  public async addRequest<T>(
    request: () => Promise<T>,
    priority: number = 0,
    requestId?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const queuedRequest: QueuedRequest = {
        id,
        request,
        resolve,
        reject,
        timestamp: Date.now(),
        priority
      };

      // Insert request based on priority (higher priority first)
      const insertIndex = this.queue.findIndex(req => req.priority! < priority);
      if (insertIndex === -1) {
        this.queue.push(queuedRequest);
      } else {
        this.queue.splice(insertIndex, 0, queuedRequest);
      }

      logger.debug(LogCategory.VORTEX_API, 'Request queued', {
        requestId: id,
        queueLength: this.queue.length,
        priority
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      // Check rate limits
      if (this.requestTimes.length >= this.maxRequestsPerMinute) {
        logger.warn(LogCategory.VORTEX_API, 'Rate limit reached, waiting...', {
          requestCount: this.requestTimes.length,
          maxRequests: this.maxRequestsPerMinute
        });
        
        // Wait for the oldest request to be 1 minute old
        const oldestRequest = Math.min(...this.requestTimes);
        const waitTime = 60000 - (Date.now() - oldestRequest);
        if (waitTime > 0) {
          await this.delay(waitTime);
        }
      }

      // Ensure minimum interval between requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.minInterval) {
        const waitTime = this.minInterval - timeSinceLastRequest;
        logger.debug(LogCategory.VORTEX_API, 'Rate limiting: waiting', { waitTime });
        await this.delay(waitTime);
      }

      const queuedRequest = this.queue.shift();
      if (!queuedRequest) break;

      try {
        logger.debug(LogCategory.VORTEX_API, 'Processing queued request', {
          requestId: queuedRequest.id,
          queueLength: this.queue.length
        });

        const startTime = Date.now();
        const result = await queuedRequest.request();
        const duration = Date.now() - startTime;

        // Track request timing
        this.lastRequestTime = Date.now();
        this.requestTimes.push(this.lastRequestTime);
        this.requestCount++;

        logger.info(LogCategory.VORTEX_API, 'Request completed', {
          requestId: queuedRequest.id,
          duration,
          queueLength: this.queue.length,
          totalRequests: this.requestCount
        });

        queuedRequest.resolve(result);

      } catch (error) {
        logger.error(LogCategory.VORTEX_API, 'Request failed', error as Error, {
          requestId: queuedRequest.id,
          queueLength: this.queue.length
        });
        queuedRequest.reject(error);
      }
    }

    this.isProcessing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getQueueStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      requestCount: this.requestCount,
      requestsPerMinute: this.requestTimes.length,
      lastRequestTime: this.lastRequestTime,
      timeSinceLastRequest: Date.now() - this.lastRequestTime
    };
  }

  public clearQueue() {
    const clearedCount = this.queue.length;
    this.queue.forEach(req => {
      req.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    
    logger.info(LogCategory.VORTEX_API, 'Queue cleared', { clearedCount });
  }
}

// Export singleton instance
export const requestQueue = new RequestQueue();
export default requestQueue;
