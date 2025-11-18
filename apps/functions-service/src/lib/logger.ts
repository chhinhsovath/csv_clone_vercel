import { format } from 'date-fns'

const LOG_LEVEL = process.env.LOG_LEVEL || 'info'

const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

type LogLevel = keyof typeof levels

const colors = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m', // green
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m',
}

function formatMessage(level: LogLevel, message: string, data?: any) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss')

  const prefix = `${colors[level]}[${timestamp}] [FUNCTIONS] [${level.toUpperCase()}]${colors.reset}`

  if (data) {
    return `${prefix} ${message} ${JSON.stringify(data)}`
  }
  return `${prefix} ${message}`
}

export const logger = {
  debug: (message: string, data?: any) => {
    if (levels[LOG_LEVEL as LogLevel] <= levels.debug) {
      console.debug(formatMessage('debug', message, data))
    }
  },

  info: (message: string, data?: any) => {
    if (levels[LOG_LEVEL as LogLevel] <= levels.info) {
      console.log(formatMessage('info', message, data))
    }
  },

  warn: (message: string, data?: any) => {
    if (levels[LOG_LEVEL as LogLevel] <= levels.warn) {
      console.warn(formatMessage('warn', message, data))
    }
  },

  error: (message: string, data?: any) => {
    if (levels[LOG_LEVEL as LogLevel] <= levels.error) {
      console.error(formatMessage('error', message, data))
    }
  },
}
