// lib/logger.ts
// Vortex Logger with configurable disable option
// Set DISABLE_VORTEX_LOGGER=true environment variable to disable all logging
import { prisma } from '../prisma';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export enum LogCategory {
  VORTEX_AUTH = 'VORTEX_AUTH',
  VORTEX_API = 'VORTEX_API',
  VORTEX_QUOTES = 'VORTEX_QUOTES',
  VORTEX_ORDERS = 'VORTEX_ORDERS',
  VORTEX_POSITIONS = 'VORTEX_POSITIONS',
  DATABASE = 'DATABASE',
  AUTH = 'AUTH',
  SYSTEM = 'SYSTEM',
  UI = 'UI'
}

interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  timestamp?: Date;
  error?: Error;
  metadata?: Record<string, any>;
}

class Logger {
  private static instance: Logger;
  private isDevelopment: boolean;
  private isDisabled: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isDisabled = process.env.DISABLE_VORTEX_LOGGER === 'true';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public isLoggingDisabled(): boolean {
    return this.isDisabled;
  }

  private async saveToDatabase(logEntry: LogEntry): Promise<void> {
    try {
      // Create a simple log table if it doesn't exist
      // For now, we'll use console logging and could extend to database later
      console.log(`[${logEntry.level}] [${logEntry.category}] ${logEntry.message}`, {
        data: logEntry.data,
        userId: logEntry.userId,
        sessionId: logEntry.sessionId,
        timestamp: logEntry.timestamp || new Date(),
        error: logEntry.error?.stack,
        metadata: logEntry.metadata
      });
    } catch (error) {
      console.error('Failed to save log to database:', error);
    }
  }

  private formatMessage(level: LogLevel, category: LogCategory, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] [${category}] ${message}${dataStr}`;
  }

  public async log(entry: LogEntry): Promise<void> {
    // Skip all logging if disabled
    if (this.isDisabled) {
      return;
    }

    const timestamp = new Date();
    const logEntry = { ...entry, timestamp };

    // Always log to console in development
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage(
        entry.level,
        entry.category,
        entry.message,
        entry.data
      );
      
      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
        case LogLevel.CRITICAL:
          console.error(formattedMessage, entry.error);
          break;
      }
    }

    // Save to database for production or when needed
    await this.saveToDatabase(logEntry);
  }

  public async debug(category: LogCategory, message: string, data?: any, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      level: LogLevel.DEBUG,
      category,
      message,
      data,
      metadata
    });
  }

  public async info(category: LogCategory, message: string, data?: any, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      level: LogLevel.INFO,
      category,
      message,
      data,
      metadata
    });
  }

  public async warn(category: LogCategory, message: string, data?: any, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      level: LogLevel.WARN,
      category,
      message,
      data,
      metadata
    });
  }

  public async error(category: LogCategory, message: string, error?: Error, data?: any, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      level: LogLevel.ERROR,
      category,
      message,
      data,
      error,
      metadata
    });
  }

  public async critical(category: LogCategory, message: string, error?: Error, data?: any, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      level: LogLevel.CRITICAL,
      category,
      message,
      data,
      error,
      metadata
    });
  }

  // Vortex-specific logging methods
  public async logVortexAuth(message: string, data?: any, userId?: string): Promise<void> {
    await this.info(LogCategory.VORTEX_AUTH, message, data, { userId });
  }

  public async logVortexAPI(message: string, data?: any, error?: Error): Promise<void> {
    if (error) {
      await this.error(LogCategory.VORTEX_API, message, error, data);
    } else {
      await this.info(LogCategory.VORTEX_API, message, data);
    }
  }

  public async logVortexQuotes(message: string, data?: any, error?: Error): Promise<void> {
    if (error) {
      await this.error(LogCategory.VORTEX_QUOTES, message, error, data);
    } else {
      await this.info(LogCategory.VORTEX_QUOTES, message, data);
    }
  }

  public async logDatabase(message: string, data?: any, error?: Error): Promise<void> {
    if (error) {
      await this.error(LogCategory.DATABASE, message, error, data);
    } else {
      await this.info(LogCategory.DATABASE, message, data);
    }
  }

  public async logUI(message: string, data?: any, userId?: string): Promise<void> {
    await this.info(LogCategory.UI, message, data, { userId });
  }
}

export const logger = Logger.getInstance();
export default logger;
