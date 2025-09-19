/**
 * Type Guards and Utility Types for Type-Safe Operations
 */

import type {
  ApiResponse,
  ApiError,
  User,
  WebSocketMessage,
  WebSocketMessageType,
  ValidationError
} from '@/types'

// ============================================
// Type Guard Functions
// ============================================

/**
 * Check if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Check if a value is a valid email
 */
export function isValidEmail(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

/**
 * Check if an API response is successful
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.success && isDefined(response.data)
}

/**
 * Check if an API response contains an error
 */
export function isApiError(response: ApiResponse): response is ApiResponse & { error: ApiError } {
  return !response.success && isDefined(response.error)
}

/**
 * Check if an error is a validation error
 */
export function hasValidationErrors(error: ApiError): error is ApiError & { validationErrors: ValidationError[] } {
  return isDefined(error.validationErrors) && error.validationErrors.length > 0
}

/**
 * Check if a user is authenticated
 */
export function isAuthenticated(user: User | null): user is User {
  return isDefined(user) && isDefined(user.id) && user.isActive
}

/**
 * Check if a user has a specific role
 */
export function hasRole(user: User | null, role: string): user is User {
  return isAuthenticated(user) && user.role === role
}

/**
 * Check if a user is an admin
 */
export function isAdmin(user: User | null): user is User {
  return hasRole(user, 'admin')
}

/**
 * Type guard for WebSocket messages
 */
export function isWebSocketMessage<T = unknown>(
  data: unknown
): data is WebSocketMessage<T> {
  if (typeof data !== 'object' || data === null) return false
  
  const msg = data as Record<string, unknown>
  return (
    typeof msg.type === 'string' &&
    'payload' in msg &&
    typeof msg.timestamp === 'string'
  )
}

/**
 * Type guard for specific WebSocket message type
 */
export function isMessageType<T = unknown>(
  message: WebSocketMessage,
  type: WebSocketMessageType
): message is WebSocketMessage<T> {
  return message.type === type
}

// ============================================
// Utility Types
// ============================================

/**
 * Make all properties of T optional recursively
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T

/**
 * Make all properties of T required recursively
 */
export type DeepRequired<T> = T extends object
  ? { [P in keyof T]-?: DeepRequired<T[P]> }
  : T

/**
 * Make all properties of T readonly recursively
 */
export type DeepReadonly<T> = T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T

/**
 * Extract the type of array elements
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * Make specific properties optional
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Extract properties of type U from T
 */
export type ExtractProperties<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K]
}

/**
 * Exclude properties of type U from T
 */
export type ExcludeProperties<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K]
}

/**
 * Type for async function return types
 */
export type AsyncReturnType<T extends (...args: any[]) => Promise<any>> =
  T extends (...args: any[]) => Promise<infer R> ? R : never

/**
 * Type for function arguments
 */
export type ArgumentTypes<T> = T extends (...args: infer A) => any ? A : never

/**
 * Strict type for object keys
 */
export type StrictKeys<T> = keyof T extends never ? string : keyof T

/**
 * Union to intersection type
 */
export type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

/**
 * Nullable type helper
 */
export type Nullable<T> = T | null

/**
 * Maybe type helper (nullable or undefined)
 */
export type Maybe<T> = T | null | undefined

/**
 * Non-nullable type helper
 */
export type NonNullable<T> = T extends null | undefined ? never : T

/**
 * Type for form field state
 */
export interface FieldState<T> {
  value: T
  error: string | null
  touched: boolean
  dirty: boolean
  validating: boolean
}

/**
 * Type for form state
 */
export type FormState<T> = {
  [K in keyof T]: FieldState<T[K]>
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E }

/**
 * Create a Result success
 */
export function Ok<T>(value: T): Result<T, never> {
  return { success: true, value }
}

/**
 * Create a Result error
 */
export function Err<E>(error: E): Result<never, E> {
  return { success: false, error }
}

/**
 * Check if Result is successful
 */
export function isOk<T, E>(result: Result<T, E>): result is { success: true; value: T } {
  return result.success === true
}

/**
 * Check if Result is error
 */
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false
}

// ============================================
// Assertion Functions
// ============================================

/**
 * Assert that a condition is true
 */
export function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

/**
 * Assert that a value is defined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (!isDefined(value)) {
    throw new Error(message || 'Value is not defined')
  }
}

/**
 * Assert that a value is of a specific type
 */
export function assertType<T>(
  value: unknown,
  predicate: (value: unknown) => value is T,
  message?: string
): asserts value is T {
  if (!predicate(value)) {
    throw new Error(message || 'Type assertion failed')
  }
}

// ============================================
// Branded Types for Type Safety
// ============================================

/**
 * Create a branded type
 */
export type Brand<T, B> = T & { __brand: B }

/**
 * Common branded types
 */
export type UserId = Brand<string, 'UserId'>
export type Email = Brand<string, 'Email'>
export type Url = Brand<string, 'Url'>
export type Uuid = Brand<string, 'Uuid'>
export type Timestamp = Brand<number, 'Timestamp'>
export type PositiveNumber = Brand<number, 'PositiveNumber'>

/**
 * Create branded type constructors
 */
export function createUserId(id: string): UserId {
  assert(id.length > 0, 'User ID cannot be empty')
  return id as UserId
}

export function createEmail(email: string): Email {
  assert(isValidEmail(email), 'Invalid email format')
  return email as Email
}

export function createUrl(url: string): Url {
  try {
    new URL(url)
    return url as Url
  } catch {
    throw new Error('Invalid URL format')
  }
}

export function createPositiveNumber(num: number): PositiveNumber {
  assert(num > 0, 'Number must be positive')
  return num as PositiveNumber
}

// ============================================
// Exhaustive Check for Switch Statements
// ============================================

/**
 * Ensures all cases in a switch statement are handled
 */
export function exhaustiveCheck(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`)
}