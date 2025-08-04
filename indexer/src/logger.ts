/**
 * 📝 Structured Logging
 * Pino logger configuration for indexer
 */

import pino from 'pino';
import { config } from './config.js';

// Create logger with structured format
export const logger = pino({
  level: config.logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
      messageFormat: '{component} {msg}',
    }
  },
  base: {
    component: 'indexer'
  }
});

// Specialized loggers for different components
export const backfillLogger = logger.child({ component: 'backfill' });
export const streamLogger = logger.child({ component: 'stream' });
export const reconcileLogger = logger.child({ component: 'reconcile' });
export const dbLogger = logger.child({ component: 'database' });
export const apiLogger = logger.child({ component: 'api' });