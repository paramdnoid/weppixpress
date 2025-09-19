import 'express'
import type { AuthUser as User, SessionData } from './auth'

declare module 'express-serve-static-core' {
  interface Request {
    user?: User
    token?: string
    session?: SessionData
    requestId?: string
    startTime?: number
  }

  interface Response {
    sendSuccess<T>(data: T, message?: string): void
    sendError(error: Error | string, statusCode?: number): void
    sendPaginated<T>(data: T[], pagination: object): void
  }
}

declare module 'express' {
  export interface Request {
    user?: User
    token?: string
    session?: SessionData
    requestId?: string
    startTime?: number
  }

  export interface Response {
    sendSuccess<T>(data: T, message?: string): void
    sendError(error: Error | string, statusCode?: number): void
    sendPaginated<T>(data: T[], pagination: object): void
  }
}

export {}
