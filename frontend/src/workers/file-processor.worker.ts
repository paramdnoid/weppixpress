// frontend/src/workers/file-processor.worker.ts
import type { FileItem } from '@/types'

interface SortRequest {
  type: 'sort'
  items: FileItem[]
  sortKey: string
  sortOrder: 'asc' | 'desc'
}

interface FilterRequest {
  type: 'filter'
  items: FileItem[]
  filters: {
    search?: string
    types?: string[]
    dateRange?: [string, string]
    sizeRange?: [number, number]
    showHidden?: boolean
  }
}

interface SearchRequest {
  type: 'search'
  items: FileItem[]
  query: string
  fuzzy?: boolean
}

interface IndexRequest {
  type: 'index'
  items: FileItem[]
}

type WorkerRequest = SortRequest | FilterRequest | SearchRequest | IndexRequest

interface WorkerResponse<T = any> {
  id: string
  type: string
  result: T
  timing: number
}

// Search index for fast lookups
class SearchIndex {
  private index: Map<string, Set<number>> = new Map()
  private items: FileItem[] = []
  
  build(items: FileItem[]) {
    this.items = items
    this.index.clear()
    
    items.forEach((item, idx) => {
      // Index by name tokens
      const tokens = this.tokenize(item.name)
      tokens.forEach(token => {
        if (!this.index.has(token)) {
          this.index.set(token, new Set())
        }
        this.index.get(token)!.add(idx)
      })
      
      // Index by extension
      if (item.extension) {
        const ext = item.extension.toLowerCase()
        if (!this.index.has(ext)) {
          this.index.set(ext, new Set())
        }
        this.index.get(ext)!.add(idx)
      }
    })
  }
  
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[\s\-_.]+/)
      .filter(token => token.length > 1)
  }
  
  search(query: string, fuzzy = false): number[] {
    const queryTokens = this.tokenize(query)
    const matchingSets: Set<number>[] = []
    
    queryTokens.forEach(token => {
      const matches = new Set<number>()
      
      // Exact match
      if (this.index.has(token)) {
        this.index.get(token)!.forEach(idx => matches.add(idx))
      }
      
      // Fuzzy match (prefix)
      if (fuzzy) {
        for (const [key, indices] of this.index.entries()) {
          if (key.startsWith(token)) {
            indices.forEach(idx => matches.add(idx))
          }
        }
      }
      
      matchingSets.push(matches)
    })
    
    // Find intersection of all matching sets
    if (matchingSets.length === 0) return []
    
    let result = matchingSets[0]
    for (let i = 1; i < matchingSets.length; i++) {
      result = new Set([...result].filter(x => matchingSets[i].has(x)))
    }
    
    return Array.from(result)
  }
}

// Sorting algorithms
class FileSorter {
  private collator = new Intl.Collator(undefined, { 
    numeric: true, 
    sensitivity: 'base' 
  })
  
  sort(items: FileItem[], key: string, order: 'asc' | 'desc'): FileItem[] {
    const multiplier = order === 'asc' ? 1 : -1
    const sorted = [...items]
    
    sorted.sort((a, b) => {
      // Folders always come first
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
      }
      
      let comparison = 0
      
      switch (key) {
        case 'name':
          comparison = this.collator.compare(a.name, b.name)
          break
          
        case 'size':
          const sizeA = a.type === 'file' ? (a.size || 0) : 0
          const sizeB = b.type === 'file' ? (b.size || 0) : 0
          comparison = sizeA - sizeB
          break
          
        case 'modified':
          const timeA = a.modified ? new Date(a.modified).getTime() : 0
          const timeB = b.modified ? new Date(b.modified).getTime() : 0
          comparison = timeA - timeB
          break
          
        case 'extension':
          const extA = a.extension || ''
          const extB = b.extension || ''
          comparison = this.collator.compare(extA, extB)
          break
          
        default:
          comparison = 0
      }
      
      return comparison * multiplier
    })
    
    return sorted
  }
}

// Filtering logic
class FileFilter {
  filter(items: FileItem[], filters: FilterRequest['filters']): FileItem[] {
    let filtered = [...items]
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchLower)
      )
    }
    
    // Type filter
    if (filters.types && filters.types.length > 0) {
      const typeSet = new Set(filters.types)
      filtered = filtered.filter(item => {
        if (item.type === 'folder') return true
        return item.extension && typeSet.has(item.extension)
      })
    }
    
    // Date range filter
    if (filters.dateRange) {
      const [start, end] = filters.dateRange.map(d => new Date(d).getTime())
      filtered = filtered.filter(item => {
        const modified = item.modified ? new Date(item.modified).getTime() : 0
        return modified >= start && modified <= end
      })
    }
    
    // Size range filter
    if (filters.sizeRange) {
      const [min, max] = filters.sizeRange
      filtered = filtered.filter(item => {
        if (item.type === 'folder') return true
        const size = item.size || 0
        return size >= min && size <= max
      })
    }
    
    // Hidden files filter
    if (!filters.showHidden) {
      filtered = filtered.filter(item => !item.name.startsWith('.'))
    }
    
    return filtered
  }
}

// Main worker logic
const searchIndex = new SearchIndex()
const sorter = new FileSorter()
const filter = new FileFilter()

self.onmessage = (event: MessageEvent<WorkerRequest & { id: string }>) => {
  const startTime = performance.now()
  const { type, id } = event.data
  let result: any
  
  try {
    switch (type) {
      case 'sort':
        const sortData = event.data as SortRequest & { id: string }
        result = sorter.sort(sortData.items, sortData.sortKey, sortData.sortOrder)
        break
        
      case 'filter':
        const filterData = event.data as FilterRequest & { id: string }
        result = filter.filter(filterData.items, filterData.filters)
        break
        
      case 'search':
        const searchData = event.data as SearchRequest & { id: string }
        searchIndex.build(searchData.items)
        const indices = searchIndex.search(searchData.query, searchData.fuzzy)
        result = indices.map(idx => searchData.items[idx])
        break
        
      case 'index':
        const indexData = event.data as IndexRequest & { id: string }
        searchIndex.build(indexData.items)
        result = { indexed: indexData.items.length }
        break
        
      default:
        throw new Error(`Unknown request type: ${type}`)
    }
    
    const response: WorkerResponse = {
      id,
      type,
      result,
      timing: performance.now() - startTime
    }
    
    self.postMessage(response)
  } catch (error) {
    self.postMessage({
      id,
      type,
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: performance.now() - startTime
    })
  }
}

// Export for TypeScript
export {}