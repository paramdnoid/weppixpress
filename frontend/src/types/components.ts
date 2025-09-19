/**
 * Type definitions for Vue components
 */

import type { Component, DefineComponent } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

// Base component props
export interface BaseComponentProps {
  class?: string | Record<string, boolean> | Array<string | Record<string, boolean>>
  style?: string | Record<string, string | number>
}

// Common emits
export interface BaseEmits {
  (e: 'update:modelValue', value: any): void
  (e: 'change', value: any): void
  (e: 'input', value: any): void
}

// Form component props
export interface FormFieldProps extends BaseComponentProps {
  modelValue?: any
  name?: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  error?: string
  hint?: string
}

// Button props
export interface ButtonProps extends BaseComponentProps {
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'link'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  block?: boolean
  outline?: boolean
  to?: RouteLocationRaw
  href?: string
  icon?: string
}

// Modal props
export interface ModalProps extends BaseComponentProps {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeButton?: boolean
  backdrop?: boolean | 'static'
  keyboard?: boolean
  centered?: boolean
  scrollable?: boolean
  fullscreen?: boolean | 'sm-down' | 'md-down' | 'lg-down' | 'xl-down' | 'xxl-down'
}

// Table props
export interface TableColumn<T = any> {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
  formatter?: (value: any, item: T) => string
  component?: Component | DefineComponent
  componentProps?: (item: T) => Record<string, any>
}

export interface TableProps<T = any> extends BaseComponentProps {
  columns: TableColumn<T>[]
  items: T[]
  loading?: boolean
  selectable?: boolean
  selectedItems?: T[]
  sortBy?: string
  sortDesc?: boolean
  perPage?: number
  currentPage?: number
  totalItems?: number
  searchable?: boolean
  searchQuery?: string
  emptyText?: string
  hover?: boolean
  striped?: boolean
  bordered?: boolean
  borderless?: boolean
  small?: boolean
  responsive?: boolean | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
}

// Card props
export interface CardProps extends BaseComponentProps {
  title?: string
  subtitle?: string
  body?: boolean
  footer?: boolean
  img?: string
  imgAlt?: string
  imgTop?: boolean
  imgBottom?: boolean
  overlay?: boolean
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
  borderVariant?: string
  textVariant?: string
  bgVariant?: string
}

// Alert props
export interface AlertProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
  dismissible?: boolean
  show?: boolean
  fade?: boolean
}

// Pagination props
export interface PaginationProps extends BaseComponentProps {
  modelValue: number
  totalPages: number
  perPage?: number
  maxVisibleButtons?: number
  firstText?: string
  prevText?: string
  nextText?: string
  lastText?: string
  ellipsisText?: string
  hideGotoEndButtons?: boolean
  hideEllipsis?: boolean
  disabled?: boolean
  small?: boolean
  pills?: boolean
}

// Dropdown props
export interface DropdownItem {
  text: string
  value?: any
  to?: RouteLocationRaw
  href?: string
  disabled?: boolean
  divider?: boolean
  header?: boolean
  action?: () => void
}

export interface DropdownProps extends BaseComponentProps {
  items: DropdownItem[]
  text?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  split?: boolean
  right?: boolean
  dropup?: boolean
  dropright?: boolean
  dropleft?: boolean
  disabled?: boolean
}

// Toast props
export interface ToastProps {
  id?: string
  title?: string
  message: string
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
  autoHide?: boolean
  delay?: number
  solid?: boolean
  appendToast?: boolean
  noCloseButton?: boolean
}

// File upload props
export interface FileUploadProps extends BaseComponentProps {
  modelValue?: File | File[] | null
  accept?: string
  multiple?: boolean
  maxSize?: number
  maxFiles?: number
  disabled?: boolean
  placeholder?: string
  browseText?: string
  dropPlaceholder?: string
  noDropPlaceholder?: string
  noBrowse?: boolean
  noDrop?: boolean
}

// Icon props
export interface IconProps extends BaseComponentProps {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  color?: string
  spin?: boolean
  pulse?: boolean
  flip?: 'horizontal' | 'vertical' | 'both'
  rotate?: 90 | 180 | 270
}

// Badge props
export interface BadgeProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
  pill?: boolean
  dot?: boolean
}

// Progress props
export interface ProgressProps extends BaseComponentProps {
  value: number
  max?: number
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
  striped?: boolean
  animated?: boolean
  showProgress?: boolean
  showValue?: boolean
  height?: string | number
}

// Tabs props
export interface TabItem {
  key: string
  title: string
  disabled?: boolean
  content?: Component | DefineComponent
  lazy?: boolean
}

export interface TabsProps extends BaseComponentProps {
  modelValue?: string
  tabs: TabItem[]
  variant?: 'tabs' | 'pills'
  vertical?: boolean
  end?: boolean
  fill?: boolean
  justified?: boolean
  contentClass?: string
  navClass?: string
  navWrapperClass?: string
  small?: boolean
  card?: boolean
  noFade?: boolean
}

// Avatar props
export interface AvatarProps extends BaseComponentProps {
  src?: string
  alt?: string
  text?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | number
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
  square?: boolean
  rounded?: boolean | 'sm' | 'lg' | 'circle' | 'pill' | 'top' | 'right' | 'bottom' | 'left'
  button?: boolean
  badge?: string | number
  badgeVariant?: BadgeProps['variant']
  badgeLeft?: boolean
  badgeTop?: boolean
}

// Export component prop types
export type ComponentProps = 
  | BaseComponentProps
  | FormFieldProps
  | ButtonProps
  | ModalProps
  | TableProps
  | CardProps
  | AlertProps
  | PaginationProps
  | DropdownProps
  | ToastProps
  | FileUploadProps
  | IconProps
  | BadgeProps
  | ProgressProps
  | TabsProps
  | AvatarProps
