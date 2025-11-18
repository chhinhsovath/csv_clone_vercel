import { format } from 'date-fns'

const LOG_LEVEL = process.env.LOG_LEVEL || 'info'
const LOG_FORMAT = process.env.LOG_FORMAT || 'text'

const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

type LogLevel = keyof typeof levels

const colors = {
  debug: '\x1b[36m',    // cyan
  info: '\x1b[32m',     // green
  warn: '\x1b[33m',     // yellow
  error: '\x1b[31m',    // red
  reset: '\x1b[0m',
}

function formatMessage(level: LogLevel, message: string, data?: any) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss')

  if (LOG_FORMAT === 'json') {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(data && { data }),
    })
  }

  const prefix = `${colors[level]}[${timestamp}] [${level.toUpperCase()}]${colors.reset}`
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

  error: (message: string | Error, data?: any) => {
    if (levels[LOG_LEVEL as LogLevel] <= levels.error) {
      const errorMessage = message instanceof Error ? message.message : message
      const errorStack = message instanceof Error ? message.stack : undefined
      console.error(
        formatMessage('error', errorMessage, {
          ...data,
          ...(errorStack && { stack: errorStack }),
        })
      )
    }
  },
}
