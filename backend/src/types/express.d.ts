import { User, Session } from './index'

declare global {
  namespace Express {
    interface Request {
      user?: User
      token?: string
      session?: Session
      requestId?: string
      startTime?: number
    }
    
    interface Response {
      sendSuccess<T>(data: T, message?: string): void
      sendError(error: Error | string, statusCode?: number): void
      sendPaginated<T>(data: T[], pagination: object): void
    }
  }
}

export {}
