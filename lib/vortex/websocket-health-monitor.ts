// lib/vortex/websocket-health-monitor.ts

/**
 * WebSocket Health Monitor
 * 
 * Monitors WebSocket connection health and provides diagnostics.
 * Features:
 * - Connection latency tracking
 * - Message rate monitoring
 * - Error rate tracking
 * - Health score calculation
 * - Automatic diagnostics
 */

export interface HealthMetrics {
  // Connection metrics
  isConnected: boolean;
  connectionUptime: number; // in milliseconds
  reconnectCount: number;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;

  // Message metrics
  messageCount: number;
  messagesPerSecond: number;
  lastMessageAt: Date | null;

  // Error metrics
  errorCount: number;
  lastErrorAt: Date | null;
  lastError: string | null;

  // Latency metrics
  averageLatency: number; // in milliseconds
  lastLatency: number | null;

  // Health score (0-100)
  healthScore: number;

  // Status
  status: 'healthy' | 'degraded' | 'critical' | 'disconnected';
}

export class WebSocketHealthMonitor {
  private connectionStartTime: Date | null = null;
  private lastConnectedAt: Date | null = null;
  private lastDisconnectedAt: Date | null = null;
  private reconnectCount = 0;

  private messageCount = 0;
  private messageTimestamps: number[] = [];
  private lastMessageAt: Date | null = null;

  private errorCount = 0;
  private lastErrorAt: Date | null = null;
  private lastError: string | null = null;

  private latencyMeasurements: number[] = [];
  private maxLatencyHistory = 20;

  private isCurrentlyConnected = false;

  /**
   * Record a connection event
   */
  public recordConnection(): void {
    console.log('✅ [HealthMonitor] Connection established');
    this.isCurrentlyConnected = true;
    this.connectionStartTime = new Date();
    this.lastConnectedAt = new Date();
    
    if (this.reconnectCount > 0) {
      console.log(`🔄 [HealthMonitor] Reconnection #${this.reconnectCount}`);
    }
  }

  /**
   * Record a disconnection event
   */
  public recordDisconnection(): void {
    console.log('❌ [HealthMonitor] Connection lost');
    this.isCurrentlyConnected = false;
    this.lastDisconnectedAt = new Date();
    this.connectionStartTime = null;
    this.reconnectCount++;
  }

  /**
   * Record a message received
   */
  public recordMessage(): void {
    const now = Date.now();
    this.messageCount++;
    this.lastMessageAt = new Date();
    this.messageTimestamps.push(now);

    // Keep only last 60 seconds of timestamps
    const oneMinuteAgo = now - 60000;
    this.messageTimestamps = this.messageTimestamps.filter(ts => ts > oneMinuteAgo);

    console.log(`📨 [HealthMonitor] Message received (total: ${this.messageCount})`);
  }

  /**
   * Record an error
   */
  public recordError(error: string | Error): void {
    const errorMessage = error instanceof Error ? error.message : error;
    console.error(`🚨 [HealthMonitor] Error recorded:`, errorMessage);
    
    this.errorCount++;
    this.lastErrorAt = new Date();
    this.lastError = errorMessage;
  }

  /**
   * Record latency measurement
   */
  public recordLatency(latencyMs: number): void {
    this.latencyMeasurements.push(latencyMs);
    
    // Keep only last N measurements
    if (this.latencyMeasurements.length > this.maxLatencyHistory) {
      this.latencyMeasurements.shift();
    }

    console.log(`⏱️ [HealthMonitor] Latency: ${latencyMs}ms (avg: ${this.getAverageLatency().toFixed(2)}ms)`);
  }

  /**
   * Calculate average latency
   */
  private getAverageLatency(): number {
    if (this.latencyMeasurements.length === 0) return 0;
    const sum = this.latencyMeasurements.reduce((a, b) => a + b, 0);
    return sum / this.latencyMeasurements.length;
  }

  /**
   * Calculate messages per second
   */
  private getMessagesPerSecond(): number {
    if (this.messageTimestamps.length === 0) return 0;
    
    const now = Date.now();
    const recentTimestamps = this.messageTimestamps.filter(ts => ts > now - 10000); // Last 10 seconds
    return recentTimestamps.length / 10;
  }

  /**
   * Calculate connection uptime in milliseconds
   */
  private getConnectionUptime(): number {
    if (!this.isCurrentlyConnected || !this.connectionStartTime) return 0;
    return Date.now() - this.connectionStartTime.getTime();
  }

  /**
   * Calculate health score (0-100)
   */
  private calculateHealthScore(): number {
    let score = 100;

    // Deduct for disconnection
    if (!this.isCurrentlyConnected) {
      score -= 50;
    }

    // Deduct for recent errors
    if (this.lastErrorAt) {
      const timeSinceError = Date.now() - this.lastErrorAt.getTime();
      if (timeSinceError < 60000) { // Within last minute
        score -= 20;
      } else if (timeSinceError < 300000) { // Within last 5 minutes
        score -= 10;
      }
    }

    // Deduct for high reconnect count
    if (this.reconnectCount > 5) {
      score -= 15;
    } else if (this.reconnectCount > 2) {
      score -= 10;
    }

    // Deduct for high latency
    const avgLatency = this.getAverageLatency();
    if (avgLatency > 1000) {
      score -= 20;
    } else if (avgLatency > 500) {
      score -= 10;
    }

    // Deduct for no recent messages (if connected)
    if (this.isCurrentlyConnected && this.lastMessageAt) {
      const timeSinceMessage = Date.now() - this.lastMessageAt.getTime();
      if (timeSinceMessage > 60000) { // No messages in last minute
        score -= 15;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine status based on health score
   */
  private getStatus(): HealthMetrics['status'] {
    if (!this.isCurrentlyConnected) return 'disconnected';
    
    const score = this.calculateHealthScore();
    if (score >= 80) return 'healthy';
    if (score >= 60) return 'degraded';
    return 'critical';
  }

  /**
   * Get current health metrics
   */
  public getMetrics(): HealthMetrics {
    const metrics: HealthMetrics = {
      isConnected: this.isCurrentlyConnected,
      connectionUptime: this.getConnectionUptime(),
      reconnectCount: this.reconnectCount,
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,

      messageCount: this.messageCount,
      messagesPerSecond: this.getMessagesPerSecond(),
      lastMessageAt: this.lastMessageAt,

      errorCount: this.errorCount,
      lastErrorAt: this.lastErrorAt,
      lastError: this.lastError,

      averageLatency: this.getAverageLatency(),
      lastLatency: this.latencyMeasurements.length > 0 
        ? this.latencyMeasurements[this.latencyMeasurements.length - 1] 
        : null,

      healthScore: this.calculateHealthScore(),
      status: this.getStatus()
    };

    return metrics;
  }

  /**
   * Get diagnostic report
   */
  public getDiagnostics(): string[] {
    const diagnostics: string[] = [];
    const metrics = this.getMetrics();

    console.log('🔍 [HealthMonitor] Running diagnostics...');

    if (!metrics.isConnected) {
      diagnostics.push('❌ WebSocket is not connected');
      if (metrics.lastDisconnectedAt) {
        const timeSinceDisconnect = Date.now() - metrics.lastDisconnectedAt.getTime();
        diagnostics.push(`⏱️  Disconnected ${Math.floor(timeSinceDisconnect / 1000)}s ago`);
      }
    } else {
      diagnostics.push('✅ WebSocket is connected');
      diagnostics.push(`⏱️  Uptime: ${Math.floor(metrics.connectionUptime / 1000)}s`);
    }

    if (metrics.reconnectCount > 0) {
      diagnostics.push(`🔄 Reconnected ${metrics.reconnectCount} time(s)`);
    }

    if (metrics.messageCount === 0) {
      diagnostics.push('⚠️  No messages received yet');
    } else {
      diagnostics.push(`📨 Received ${metrics.messageCount} messages (${metrics.messagesPerSecond.toFixed(2)}/s)`);
    }

    if (metrics.errorCount > 0) {
      diagnostics.push(`🚨 ${metrics.errorCount} error(s) encountered`);
      if (metrics.lastError) {
        diagnostics.push(`   Last error: ${metrics.lastError}`);
      }
    }

    if (metrics.averageLatency > 0) {
      const latencyStatus = metrics.averageLatency > 500 ? '⚠️' : '✅';
      diagnostics.push(`${latencyStatus} Average latency: ${metrics.averageLatency.toFixed(2)}ms`);
    }

    diagnostics.push(`💚 Health Score: ${metrics.healthScore}/100 (${metrics.status.toUpperCase()})`);

    console.log('🔍 [HealthMonitor] Diagnostics:', diagnostics);

    return diagnostics;
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    console.log('🔄 [HealthMonitor] Resetting all metrics');
    
    this.connectionStartTime = null;
    this.lastConnectedAt = null;
    this.lastDisconnectedAt = null;
    this.reconnectCount = 0;

    this.messageCount = 0;
    this.messageTimestamps = [];
    this.lastMessageAt = null;

    this.errorCount = 0;
    this.lastErrorAt = null;
    this.lastError = null;

    this.latencyMeasurements = [];
    this.isCurrentlyConnected = false;
  }
}

// Export singleton instance
export const websocketHealthMonitor = new WebSocketHealthMonitor();
export default websocketHealthMonitor;