export interface FileEntry {
  file: File
  relativePath: string
  webkitRelativePath?: string
}

export interface FolderScanProgress {
  totalItems: number
  processedItems: number
  currentPath: string
  percentage: number
}

export interface FolderScanResult {
  files: FileEntry[]
  totalSize: number
  totalFiles: number
  structure: FolderStructure
}

export interface FolderStructure {
  [path: string]: {
    files: number
    size: number
    subfolders: string[]
  }
}

export class FolderScannerService {
  private onProgress: ((progress: FolderScanProgress) => void) | null = null
  private cancelled = false

  constructor(progressCallback?: (progress: FolderScanProgress) => void) {
    this.onProgress = progressCallback || null
  }

  async scanFiles(items: FileSystemEntry[] | DataTransferItemList | FileList): Promise<FolderScanResult> {
    this.cancelled = false
    const files: FileEntry[] = []
    let totalSize = 0
    const structure: FolderStructure = {}

    if (items instanceof FileList) {
      // Handle FileList (input[type="file"] with webkitdirectory)
      const fileList = Array.from(items)
      const totalItems = fileList.length

      for (let i = 0; i < fileList.length; i++) {
        if (this.cancelled) break

        const file = fileList[i]
        const relativePath = file.webkitRelativePath || file.name

        this.updateProgress({
          totalItems,
          processedItems: i + 1,
          currentPath: relativePath,
          percentage: Math.round(((i + 1) / totalItems) * 100)
        })

        files.push({
          file,
          relativePath,
          webkitRelativePath: file.webkitRelativePath
        })

        totalSize += file.size
        this.updateStructure(structure, relativePath, file.size)

        // Allow UI to update
        if (i % 50 === 0) {
          await this.delay(1)
        }
      }
    } else {
      // Handle drag & drop items (FileSystemEntry[])
      const entries = items instanceof DataTransferItemList 
        ? Array.from(items).map(item => item.webkitGetAsEntry()).filter(Boolean) as FileSystemEntry[]
        : items

      // First pass: count total items for progress
      const totalItems = await this.countTotalItems(entries)
      let processedItems = 0

      // Second pass: process all files
      for (const entry of entries) {
        if (this.cancelled) break

        await this.processEntry(entry, '', files, structure, (path) => {
          processedItems++
          this.updateProgress({
            totalItems,
            processedItems,
            currentPath: path,
            percentage: Math.round((processedItems / totalItems) * 100)
          })
        })
      }

      totalSize = files.reduce((sum, fileEntry) => sum + fileEntry.file.size, 0)
    }

    return {
      files,
      totalSize,
      totalFiles: files.length,
      structure
    }
  }

  private async countTotalItems(entries: FileSystemEntry[]): Promise<number> {
    let count = 0
    
    const countRecursive = async (entry: FileSystemEntry): Promise<void> => {
      if (this.cancelled) return

      if (entry.isFile) {
        count++
      } else if (entry.isDirectory) {
        const dirReader = (entry as FileSystemDirectoryEntry).createReader()
        const entries = await this.readAllEntries(dirReader)
        
        for (const childEntry of entries) {
          await countRecursive(childEntry)
        }
      }
    }

    for (const entry of entries) {
      await countRecursive(entry)
    }

    return count
  }

  private async processEntry(
    entry: FileSystemEntry,
    basePath: string,
    files: FileEntry[],
    structure: FolderStructure,
    onProgress: (path: string) => void
  ): Promise<void> {
    if (this.cancelled) return

    const currentPath = basePath ? `${basePath}/${entry.name}` : entry.name

    if (entry.isFile) {
      const file = await this.getFileFromEntry(entry as FileSystemFileEntry)
      if (file) {
        files.push({
          file,
          relativePath: currentPath
        })
        this.updateStructure(structure, currentPath, file.size)
        onProgress(currentPath)
      }
    } else if (entry.isDirectory) {
      const dirReader = (entry as FileSystemDirectoryEntry).createReader()
      const entries = await this.readAllEntries(dirReader)
      
      // Initialize directory in structure
      this.initializeDirectory(structure, currentPath)
      
      for (const childEntry of entries) {
        if (this.cancelled) break
        await this.processEntry(childEntry, currentPath, files, structure, onProgress)
      }
    }
  }

  private async readAllEntries(dirReader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
    const entries: FileSystemEntry[] = []
    
    const readEntries = (): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
        dirReader.readEntries(resolve, reject)
      })
    }

    let results = await readEntries()
    while (results.length > 0) {
      entries.push(...results)
      results = await readEntries()
    }

    return entries
  }

  private getFileFromEntry(fileEntry: FileSystemFileEntry): Promise<File | null> {
    return new Promise((resolve) => {
      fileEntry.file(resolve, () => resolve(null))
    })
  }

  private updateStructure(structure: FolderStructure, filePath: string, fileSize: number): void {
    const pathParts = filePath.split('/')
    
    // Update each directory level
    for (let i = 0; i < pathParts.length - 1; i++) {
      const dirPath = pathParts.slice(0, i + 1).join('/')
      
      if (!structure[dirPath]) {
        structure[dirPath] = { files: 0, size: 0, subfolders: [] }
      }
      
      structure[dirPath].size += fileSize
      structure[dirPath].files++
      
      // Add subfolder reference if it doesn't exist
      if (i < pathParts.length - 2) {
        const subfolderPath = pathParts.slice(0, i + 2).join('/')
        if (!structure[dirPath].subfolders.includes(subfolderPath)) {
          structure[dirPath].subfolders.push(subfolderPath)
        }
      }
    }
  }

  private initializeDirectory(structure: FolderStructure, dirPath: string): void {
    if (!structure[dirPath]) {
      structure[dirPath] = { files: 0, size: 0, subfolders: [] }
    }
  }

  private updateProgress(progress: FolderScanProgress): void {
    if (this.onProgress) {
      this.onProgress(progress)
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  cancel(): void {
    this.cancelled = true
  }

  isCancelled(): boolean {
    return this.cancelled
  }
}