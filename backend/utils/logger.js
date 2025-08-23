import { createLogger, format, transports } from 'winston';

// Central logger configuration
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack, ...meta }) => {
      let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
      
      if (stack) {
        logMessage += `\n${stack}`;
      }
      
      if (Object.keys(meta).length > 0) {
        logMessage += ` ${JSON.stringify(meta)}`;
      }
      
      return logMessage;
    })
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

// File transports nur in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new transports.File({ 
    filename: 'logs/error.log', 
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  }));
  
  logger.add(new transports.File({ 
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB  
    maxFiles: 5,
    tailable: true
  }));
}

// Security Logger für sensible Ereignisse

// Performance Logger

export default logger;
