/**
 * Type definitions for Vue composables
 */

import type { Ref, ComputedRef, ShallowRef } from 'vue'

// Loading state composable
export interface UseLoadingReturn {
  isLoading: Ref<boolean>
  startLoading: () => void
  stopLoading: () => void
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>
}

// Error handling composable
export interface UseErrorReturn {
  error: Ref<Error | null>
  errorMessage: ComputedRef<string>
  setError: (error: Error | string) => void
  clearError: () => void
  handleError: (error: unknown) => void
}

// Pagination composable
export interface PaginationOptions {
  page?: number
  perPage?: number
  total?: number
}

export interface UsePaginationReturn {
  currentPage: Ref<number>
  perPage: Ref<number>
  total: Ref<number>
  totalPages: ComputedRef<number>
  from: ComputedRef<number>
  to: ComputedRef<number>
  setPage: (page: number) => void
  setPerPage: (perPage: number) => void
  setTotal: (total: number) => void
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
  isFirstPage: ComputedRef<boolean>
  isLastPage: ComputedRef<boolean>
}

// Form validation composable
export interface ValidationRule<T = any> {
  validator: (value: T) => boolean | string | Promise<boolean | string>
  message?: string
  trigger?: 'blur' | 'change' | 'submit'
}

export interface FieldState<T = any> {
  value: Ref<T>
  errors: Ref<string[]>
  touched: Ref<boolean>
  dirty: Ref<boolean>
  valid: ComputedRef<boolean>
  validate: () => Promise<boolean>
  reset: () => void
  setError: (error: string) => void
  clearErrors: () => void
}

export interface UseFormReturn<T extends Record<string, any>> {
  values: Ref<T>
  errors: Ref<Partial<Record<keyof T, string[]>>>
  touched: Ref<Partial<Record<keyof T, boolean>>>
  dirty: ComputedRef<boolean>
  valid: ComputedRef<boolean>
  isSubmitting: Ref<boolean>
  getField: <K extends keyof T>(name: K) => FieldState<T[K]>
  setFieldValue: <K extends keyof T>(name: K, value: T[K]) => void
  setFieldError: <K extends keyof T>(name: K, error: string) => void
  setFieldTouched: <K extends keyof T>(name: K, touched?: boolean) => void
  setErrors: (errors: Partial<Record<keyof T, string>>) => void
  validate: () => Promise<boolean>
  validateField: <K extends keyof T>(name: K) => Promise<boolean>
  handleSubmit: (onSubmit: (values: T) => Promise<void> | void) => () => Promise<void>
  reset: (values?: Partial<T>) => void
  resetField: <K extends keyof T>(name: K) => void
}

// Debounce composable
export interface UseDebounceReturn<T extends (...args: any[]) => any> {
  debounced: T
  cancel: () => void
  flush: () => void
  pending: Ref<boolean>
}

// LocalStorage composable
export interface UseLocalStorageOptions<T> {
  serializer?: {
    read: (value: string) => T
    write: (value: T) => string
  }
  onError?: (error: Error) => void
  initializeWithValue?: boolean
  syncData?: boolean
}

export interface UseLocalStorageReturn<T> {
  data: Ref<T>
  setData: (value: T) => void
  removeData: () => void
  refresh: () => void
}

// WebSocket composable
export interface UseWebSocketOptions {
  autoReconnect?: boolean
  reconnectDelay?: number
  reconnectAttempts?: number
  heartbeat?: boolean
  heartbeatInterval?: number
  onOpen?: (event: Event) => void
  onMessage?: (data: any) => void
  onError?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
}

export interface UseWebSocketReturn {
  ws: ShallowRef<WebSocket | null>
  status: Ref<'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED'>
  data: Ref<any>
  send: (data: any) => void
  open: () => void
  close: () => void
}

// Infinite scroll composable
export interface UseInfiniteScrollOptions {
  threshold?: number
  rootMargin?: string
  root?: Element | null
  onLoadMore: () => Promise<void> | void
}

export interface UseInfiniteScrollReturn {
  targetRef: Ref<Element | null>
  isLoading: Ref<boolean>
  isComplete: Ref<boolean>
  reset: () => void
  load: () => Promise<void>
}

// Modal composable
export interface UseModalReturn {
  isOpen: Ref<boolean>
  open: () => void
  close: () => void
  toggle: () => void
}

// Clipboard composable
export interface UseClipboardReturn {
  copy: (text: string) => Promise<void>
  copied: Ref<boolean>
  isSupported: ComputedRef<boolean>
}

// Dark mode composable
export interface UseDarkModeReturn {
  isDark: Ref<boolean>
  toggle: () => void
  enable: () => void
  disable: () => void
}

// Breakpoints composable
export interface BreakpointState {
  xs: boolean
  sm: boolean
  md: boolean
  lg: boolean
  xl: boolean
  xxl: boolean
}

export interface UseBreakpointsReturn {
  current: ComputedRef<keyof BreakpointState>
  breakpoints: ComputedRef<BreakpointState>
  greater: (breakpoint: keyof BreakpointState) => ComputedRef<boolean>
  greaterOrEqual: (breakpoint: keyof BreakpointState) => ComputedRef<boolean>
  smaller: (breakpoint: keyof BreakpointState) => ComputedRef<boolean>
  smallerOrEqual: (breakpoint: keyof BreakpointState) => ComputedRef<boolean>
  between: (min: keyof BreakpointState, max: keyof BreakpointState) => ComputedRef<boolean>
}

// Event listener composable
export interface UseEventListenerReturn {
  stop: () => void
  start: () => void
}

// Timer composable
export interface UseTimerOptions {
  interval?: number
  immediate?: boolean
}

export interface UseTimerReturn {
  counter: Ref<number>
  isActive: Ref<boolean>
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  stop: () => void
}

// Permission composable
export interface UsePermissionReturn {
  state: Ref<PermissionState | undefined>
  isGranted: ComputedRef<boolean>
  isDenied: ComputedRef<boolean>
  isPrompt: ComputedRef<boolean>
  query: () => Promise<void>
}

// Network status composable
export interface UseNetworkReturn {
  isOnline: Ref<boolean>
  offlineAt: Ref<Date | undefined>
  downlink: Ref<number | undefined>
  downlinkMax: Ref<number | undefined>
  effectiveType: Ref<'slow-2g' | '2g' | '3g' | '4g' | undefined>
  rtt: Ref<number | undefined>
  saveData: Ref<boolean | undefined>
  type: Ref<'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown' | undefined>
}

// Fetch composable
export interface UseFetchOptions<T> {
  immediate?: boolean
  refetch?: boolean
  initialData?: T
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  transform?: (data: any) => T
}

export interface UseFetchReturn<T> {
  data: Ref<T | null>
  error: Ref<Error | null>
  isLoading: Ref<boolean>
  isFinished: Ref<boolean>
  execute: () => Promise<void>
  refresh: () => Promise<void>
  abort: () => void
}

// Search composable
export interface UseSearchOptions<T> {
  debounce?: number
  minLength?: number
  maxResults?: number
  searchFn: (query: string) => Promise<T[]> | T[]
}

export interface UseSearchReturn<T> {
  query: Ref<string>
  results: Ref<T[]>
  isSearching: Ref<boolean>
  search: (query?: string) => Promise<void>
  clear: () => void
}

// File upload composable
export interface UseFileUploadOptions {
  url: string
  accept?: string
  multiple?: boolean
  maxSize?: number
  maxFiles?: number
  onProgress?: (progress: number) => void
  onSuccess?: (response: any) => void
  onError?: (error: Error) => void
}

export interface UploadFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  response?: any
}

export interface UseFileUploadReturn {
  files: Ref<UploadFile[]>
  isUploading: Ref<boolean>
  progress: ComputedRef<number>
  upload: (files: File | File[] | FileList) => Promise<void>
  remove: (id: string) => void
  clear: () => void
  abort: (id?: string) => void
}

// Sort composable
export interface SortOptions<T> {
  defaultField?: keyof T
  defaultOrder?: 'asc' | 'desc'
  onSort?: (field: keyof T, order: 'asc' | 'desc') => void
}

export interface UseSortReturn<T> {
  sortField: Ref<keyof T | null>
  sortOrder: Ref<'asc' | 'desc'>
  sort: (field: keyof T) => void
  clearSort: () => void
  isSorted: (field: keyof T) => boolean
  getSortIcon: (field: keyof T) => string
}

// Filter composable
export interface FilterOptions<T> {
  defaultFilters?: Partial<T>
  debounce?: number
  onFilter?: (filters: Partial<T>) => void
}

export interface UseFilterReturn<T> {
  filters: Ref<Partial<T>>
  activeFilters: ComputedRef<Array<keyof T>>
  hasFilters: ComputedRef<boolean>
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void
  removeFilter: (key: keyof T) => void
  clearFilters: () => void
  resetFilters: () => void
}

// Export all composable types
export type ComposableReturns = 
  | UseLoadingReturn
  | UseErrorReturn
  | UsePaginationReturn
  | UseFormReturn<any>
  | UseDebounceReturn<any>
  | UseLocalStorageReturn<any>
  | UseWebSocketReturn
  | UseInfiniteScrollReturn
  | UseModalReturn
  | UseClipboardReturn
  | UseDarkModeReturn
  | UseBreakpointsReturn
  | UseEventListenerReturn
  | UseTimerReturn
  | UsePermissionReturn
  | UseNetworkReturn
  | UseFetchReturn<any>
  | UseSearchReturn<any>
  | UseFileUploadReturn
  | UseSortReturn<any>
  | UseFilterReturn<any>
