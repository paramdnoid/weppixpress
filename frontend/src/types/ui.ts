// UI & Component types
export interface Modal {
  id: string
  title?: string
  content?: string
  component?: unknown
  props?: Record<string, unknown>
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closable?: boolean
  persistent?: boolean
  actions?: ModalAction[]
  onClose?: () => void
  onConfirm?: () => void | Promise<void>
}

export interface ModalAction {
  label: string
  type?: 'primary' | 'secondary' | 'danger' | 'ghost'
  onClick: () => void | Promise<void>
  loading?: boolean
  disabled?: boolean
  icon?: string
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
  persistent?: boolean
  timestamp?: number
}

export interface ContextMenuItem {
  id: string
  label: string
  icon?: string
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  separator?: boolean
  submenu?: ContextMenuItem[]
  onClick?: (item: unknown) => void
}

export interface Breadcrumb {
  label: string
  path?: string
  icon?: string
  disabled?: boolean
  active?: boolean
}

export interface Tab {
  id: string
  label: string
  icon?: string
  badge?: string | number
  disabled?: boolean
  closable?: boolean
  component?: unknown
  props?: Record<string, unknown>
}

export interface TableColumn<T = unknown> {
  key: keyof T | string
  label: string
  sortable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
  fixed?: 'left' | 'right'
  formatter?: (value: unknown, row: T) => string
  component?: unknown
  className?: string
  headerClassName?: string
}

export interface TableConfig {
  selectable?: boolean
  expandable?: boolean
  striped?: boolean
  bordered?: boolean
  hover?: boolean
  compact?: boolean
  loading?: boolean
  stickyHeader?: boolean
  virtualScroll?: boolean
  rowHeight?: number
  emptyText?: string
}

export interface FormField {
  name: string
  label?: string
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'date' | 'file' | 'custom'
  value?: unknown
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  validation?: ValidationRule[]
  options?: SelectOption[]
  multiple?: boolean
  component?: unknown
  props?: Record<string, unknown>
}

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
  icon?: string
  description?: string
  group?: string
}

export interface ValidationRule {
  type: 'required' | 'email' | 'min' | 'max' | 'pattern' | 'custom'
  value?: unknown
  message: string
  validator?: (value: unknown) => boolean | Promise<boolean>
}

export interface DropdownItem {
  id: string
  label: string
  value?: unknown
  icon?: string
  disabled?: boolean
  divider?: boolean
  header?: boolean
  onClick?: () => void
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto'
  primaryColor?: string
  fontFamily?: string
  borderRadius?: string
  customCSS?: string
}
