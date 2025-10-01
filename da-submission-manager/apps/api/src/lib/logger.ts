type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LoggerOptions = {
  namespace?: string;
};

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function getEnvLevel(): LogLevel {
  const value = (process.env.LOG_LEVEL || 'info').toLowerCase();
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value;
  }
  return 'info';
}

export class Logger {
  private namespace?: string;
  private level: LogLevel;

  constructor(options?: LoggerOptions) {
    this.namespace = options?.namespace;
    this.level = getEnvLevel();
  }

  private shouldLog(level: LogLevel) {
    return levelOrder[level] >= levelOrder[this.level];
  }

  private formatMessage(message: string) {
    if (this.namespace) {
      return `[${this.namespace}] ${message}`;
    }
    return message;
  }

  debug(message: string, meta?: unknown) {
    if (!this.shouldLog('debug')) {
      return;
    }
    // eslint-disable-next-line no-console
    console.debug(this.formatMessage(message), meta ?? '');
  }

  info(message: string, meta?: unknown) {
    if (!this.shouldLog('info')) {
      return;
    }
    // eslint-disable-next-line no-console
    console.info(this.formatMessage(message), meta ?? '');
  }

  warn(message: string, meta?: unknown) {
    if (!this.shouldLog('warn')) {
      return;
    }
    // eslint-disable-next-line no-console
    console.warn(this.formatMessage(message), meta ?? '');
  }

  error(message: string, meta?: unknown) {
    if (!this.shouldLog('error')) {
      return;
    }
    // eslint-disable-next-line no-console
    console.error(this.formatMessage(message), meta ?? '');
  }
}

export const logger = new Logger({ namespace: 'api' });