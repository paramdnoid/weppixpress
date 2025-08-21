export interface FileItem {
  id?: string
  name: string
  path: string
  type: 'file' | 'folder' | 'directory'
  size?: number
  extension?: string
  modified?: string
  updatedAt?: string
  created?: string
  createdAt?: string
  hasSubfolders?: boolean
  isClickable?: boolean
  _parsedUpdatedAt?: number
  childItems?: FileItem[]
}

export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'folder' | 'directory'
  hasSubfolders?: boolean
  children?: TreeNode[] | null
}

export interface TreeData {
  title: string
  icon: string
  items: TreeNode[]
  error?: string
  loading?: boolean
}

export interface BreadcrumbItem {
  name: string
  path: string
}

export interface FileOperation {
  id?: string
  type: 'upload' | 'delete' | 'move' | 'copy' | 'rename'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  files: string[]
  progress?: number
  error?: string
  timestamp: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface FileFilters {
  types: string[]
  dateRange: [Date, Date] | null
  sizeRange: [number, number] | null
  showHidden: boolean
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface ApiError {
  message: string
  code?: string
  status?: number
}

export type SortDirection = 'asc' | 'desc'
export type ViewMode = 'grid' | 'list' | 'details'
export type SelectionMode = 'single' | 'toggle' | 'range'