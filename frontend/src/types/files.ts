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


export interface FileOperation {
  id?: string
  type: 'delete' | 'move' | 'copy' | 'rename' | 'create' | 'batch'
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


export type SortDirection = 'asc' | 'desc'
export type SelectionMode = 'single' | 'toggle' | 'range'