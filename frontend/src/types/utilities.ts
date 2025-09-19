/**
 * Generic utility types for TypeScript
 */

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>
} : T

/**
 * Make all properties required recursively
 */
export type DeepRequired<T> = T extends object ? {
  [P in keyof T]-?: DeepRequired<T[P]>
} : T

/**
 * Make all properties readonly recursively
 */
export type DeepReadonly<T> = T extends object ? {
  readonly [P in keyof T]: DeepReadonly<T[P]>
} : T

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * Make specific properties optional
 */
export type PartialFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Extract the type of array elements
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never

/**
 * Create a union type from object values
 */
export type ValueOf<T> = T[keyof T]

/**
 * Create a union type from object keys
 */
export type KeyOf<T> = keyof T

/**
 * Omit multiple properties from a type
 */
export type OmitMultiple<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

/**
 * Pick multiple properties from a type and make them optional
 */
export type PickPartial<T, K extends keyof T> = Partial<Pick<T, K>>

/**
 * Make properties nullable
 */
export type Nullable<T> = T | null

/**
 * Make all properties nullable
 */
export type NullableFields<T> = {
  [P in keyof T]: T[P] | null
}

/**
 * Make properties non-nullable
 */
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>
}

/**
 * Extract properties of a certain type
 */
export type ExtractByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K]
}

/**
 * Exclude properties of a certain type
 */
export type ExcludeByType<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K]
}

/**
 * Create a type with at least one property from T
 */
export type AtLeastOne<T> = {
  [K in keyof T]: Pick<T, K>
}[keyof T]

/**
 * Create a type with exactly one property from T
 */
export type ExactlyOne<T> = AtLeastOne<T> & Partial<T>

/**
 * Merge two types, with the second type overriding the first
 */
export type Merge<T, U> = Omit<T, keyof U> & U

/**
 * Create a type-safe enum from an object
 */
export type Enum<T extends Record<string, string | number>> = T[keyof T]

/**
 * Extract promise type
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T

/**
 * Extract function return type
 */
export type ReturnTypeOf<T extends (...args: any[]) => any> = T extends (...args: any[]) => infer R ? R : never

/**
 * Extract function parameters type
 */
export type ParametersOf<T extends (...args: any[]) => any> = T extends (...args: infer P) => any ? P : never

/**
 * Create a branded type for nominal typing
 */
export type Brand<T, B> = T & { __brand: B }

/**
 * Create a type for object paths (e.g., 'user.profile.name')
 */
export type Path<T> = T extends object ? {
  [K in keyof T]: K extends string
    ? T[K] extends object
      ? K | `${K}.${Path<T[K]>}`
      : K
    : never
}[keyof T] : never

/**
 * Get the type at a specific path in an object
 */
export type PathValue<T, P extends Path<T>> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends Path<T[K]>
      ? PathValue<T[K], Rest>
      : never
    : never
  : P extends keyof T
    ? T[P]
    : never

/**
 * Create a type that represents either success or failure
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

/**
 * Create a loading state type
 */
export type LoadingState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }

/**
 * Type for async function that may throw
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>

/**
 * Type for pagination parameters
 */
export type PaginationParams = {
  page: number
  pageSize: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

/**
 * Type for API query parameters
 */
export type QueryParams = Record<string, string | number | boolean | undefined>

/**
 * Type for form errors
 */
export type FormErrors<T> = Partial<Record<keyof T, string>>

/**
 * Type for form touched fields
 */
export type FormTouched<T> = Partial<Record<keyof T, boolean>>

/**
 * Type for mutable ref
 */
export type MutableRef<T> = { value: T }

/**
 * Type for readonly ref
 */
export type ReadonlyRef<T> = { readonly value: T }
