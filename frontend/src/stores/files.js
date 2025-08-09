import { defineStore } from 'pinia'
import axios from 'axios'

// API configuration
const API_BASE = '/files'
const API_ENDPOINTS = {
  list: `${API_BASE}`,
  upload: `${API_BASE}/upload`,
  delete: `${API_BASE}`,
  move: `${API_BASE}/move`,
  copy: `${API_BASE}/copy`,
  rename: `${API_BASE}/rename`,
  createFolder: `${API_BASE}/folder`
}

// Error message mapping
const getErrorMessage = (error) => {
  const status = error.response?.status
  const code = error.code
  
  if (code === 'NETWORK_ERROR' || code === 'ERR_NETWORK') {
    return 'Connection failed. Please check your internet connection.'
  }
  
  switch (status) {
    case 401:
      return 'Authentication required. Please log in again.'
    case 403:
      return 'Access denied to this folder.'
    case 404:
      return 'Folder not found.'
    case 413:
      return 'File too large to upload.'
    case 422:
      return 'Invalid file type or name.'
    case 507:
      return 'Insufficient storage space.'
    default:
      return error.response?.data?.message || 'An unexpected error occurred.'
  }
}

export const useFileStore = defineStore('files', {
  state: () => ({
    currentPath: '/',
    files: [],
    loading: false,
    error: null,
    root: [],
    children: [],
    selectedFiles: [],
    breadcrumbs: [],
    // Safe localStorage access
    accessToken: (typeof window !== 'undefined') ? 
      localStorage.getItem('accessToken') : null,
    // New state for better UX
    uploadProgress: 0,
    isUploading: false,
    selectedPath: null
  }),

  getters: {
    fileCount: (state) => state.files.length,
    selectedCount: (state) => state.selectedFiles.length,
    
    // Computed breadcrumbs from current path
    computedBreadcrumbs: (state) => {
      if (!state.currentPath || state.currentPath === '/') {
        return [{ name: 'Home', path: '/', isClickable: true }]
      }
      
      const parts = state.currentPath.split('/').filter(Boolean)
      return [
        { name: 'Home', path: '/', isClickable: true },
        ...parts.map((name, i) => ({
          name: decodeURIComponent(name),
          path: '/' + parts.slice(0, i + 1).join('/'),
          isClickable: true
        }))
      ]
    },

    // Check if user has access token
    isAuthenticated: (state) => !!state.accessToken,

    // Get current folder info
    currentFolder: (state) => {
      const parts = state.currentPath.split('/').filter(Boolean)
      return parts.length > 0 ? parts[parts.length - 1] : 'Home'
    }
  },

  actions: {
    // Set authentication token
    setAccessToken(token) {
      this.accessToken = token
      if (typeof window !== 'undefined') {
        if (token) {
          localStorage.setItem('accessToken', token)
        } else {
          localStorage.removeItem('accessToken')
        }
      }
    },

    // Get request headers
    getHeaders() {
      const headers = {}
      if (this.accessToken) {
        headers.Authorization = `Bearer ${this.accessToken}`
      }
      return headers
    },

    // Enhanced fetch files with better error handling
    async fetchFiles(path = this.currentPath) {
      if (this.loading) return // Prevent concurrent requests
      
      this.loading = true
      this.error = null
      
      try {
        const response = await axios.get(API_ENDPOINTS.list, {
          params: { path },
          headers: this.getHeaders()
        })
        
        this.files = response.data.children || []
        this.currentPath = path
        this.breadcrumbs = this.computedBreadcrumbs
        
        return this.files
      } catch (error) {
        console.error('Failed to fetch files:', error)
        this.error = getErrorMessage(error)
        
        // Don't clear files on error, keep previous state
        if (error.response?.status === 401) {
          this.setAccessToken(null) // Clear invalid token
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },

    // Enhanced upload with progress tracking
    async uploadFile(formData, onProgress = null) {
      if (this.isUploading) {
        throw new Error('Upload already in progress')
      }

      this.isUploading = true
      this.uploadProgress = 0
      this.error = null
      
      try {
        formData.append('path', this.currentPath)
        
        const response = await axios.post(API_ENDPOINTS.upload, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...this.getHeaders()
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            this.uploadProgress = progress
            onProgress?.(progress)
          }
        })
        
        // Refresh files after successful upload
        await this.fetchFiles()
        return response.data
      } catch (error) {
        console.error('Upload failed:', error)
        this.error = getErrorMessage(error)
        throw error
      } finally {
        this.isUploading = false
        this.uploadProgress = 0
      }
    },

    // Enhanced delete with multiple file support
    async deleteFiles(fileNames) {
      if (!Array.isArray(fileNames)) {
        fileNames = [fileNames]
      }

      this.error = null
      
      try {
        await axios.delete(API_ENDPOINTS.delete, {
          data: { 
            path: this.currentPath, 
            names: fileNames 
          },
          headers: this.getHeaders()
        })
        
        // Remove deleted files from local state immediately
        this.files = this.files.filter(file => 
          !fileNames.includes(file.name)
        )
        
        // Clear selection if deleted files were selected
        this.selectedFiles = this.selectedFiles.filter(file => 
          !fileNames.includes(file.name)
        )
        
        return true
      } catch (error) {
        console.error('Delete failed:', error)
        this.error = getErrorMessage(error)
        // Refresh files on error to ensure consistency
        await this.fetchFiles()
        throw error
      }
    },

    // Single file delete (backward compatibility)
    async deleteFile(fileName) {
      return this.deleteFiles([fileName])
    },

    // Create new folder
    async createFolder(folderName) {
      if (!folderName?.trim()) {
        throw new Error('Folder name is required')
      }

      this.error = null
      
      try {
        const response = await axios.post(API_ENDPOINTS.createFolder, {
          path: this.currentPath,
          name: folderName.trim()
        }, {
          headers: this.getHeaders()
        })
        
        await this.fetchFiles()
        return response.data
      } catch (error) {
        console.error('Create folder failed:', error)
        this.error = getErrorMessage(error)
        throw error
      }
    },

    // Move files
    async moveFiles(fileNames, destinationPath) {
      if (!Array.isArray(fileNames)) {
        fileNames = [fileNames]
      }

      this.error = null
      
      try {
        await axios.post(API_ENDPOINTS.move, {
          from: this.currentPath,
          to: destinationPath,
          names: fileNames
        }, {
          headers: this.getHeaders()
        })
        
        await this.fetchFiles()
        return true
      } catch (error) {
        console.error('Move failed:', error)
        this.error = getErrorMessage(error)
        throw error
      }
    },

    // Copy files
    async copyFiles(fileNames, destinationPath) {
      if (!Array.isArray(fileNames)) {
        fileNames = [fileNames]
      }

      this.error = null
      
      try {
        await axios.post(API_ENDPOINTS.copy, {
          from: this.currentPath,
          to: destinationPath,
          names: fileNames
        }, {
          headers: this.getHeaders()
        })
        
        await this.fetchFiles()
        return true
      } catch (error) {
        console.error('Copy failed:', error)
        this.error = getErrorMessage(error)
        throw error
      }
    },

    // Rename file
    async renameFile(oldName, newName) {
      if (!oldName || !newName?.trim()) {
        throw new Error('Both old and new names are required')
      }

      this.error = null
      
      try {
        await axios.put(API_ENDPOINTS.rename, {
          path: this.currentPath,
          oldName,
          newName: newName.trim()
        }, {
          headers: this.getHeaders()
        })
        
        await this.fetchFiles()
        return true
      } catch (error) {
        console.error('Rename failed:', error)
        this.error = getErrorMessage(error)
        throw error
      }
    },

    // Navigate to path
    async navigateToPath(path) {
      if (path === this.currentPath) return
      
      try {
        await this.fetchFiles(path)
        this.selectedFiles = [] // Clear selection when navigating
      } catch (error) {
        // On navigation error, try to stay in current path
        console.error('Navigation failed:', error)
        throw error
      }
    },

    // Refresh current directory
    async refreshFiles() {
      return this.fetchFiles(this.currentPath)
    },

    // Enhanced file selection
    selectFile(file) {
      const index = this.selectedFiles.findIndex(f => f.path === file.path)
      if (index === -1) {
        this.selectedFiles.push(file)
      }
    },

    deselectFile(file) {
      this.selectedFiles = this.selectedFiles.filter(f => f.path !== file.path)
    },

    toggleFileSelection(file) {
      const index = this.selectedFiles.findIndex(f => f.path === file.path)
      if (index === -1) {
        this.selectFile(file)
      } else {
        this.deselectFile(file)
      }
    },

    selectAll() {
      this.selectedFiles = [...this.files]
    },

    selectNone() {
      this.selectedFiles = []
    },

    clearSelection() {
      this.selectedFiles = []
    },

    // Load children for tree view with caching
    async fetchFolderChildren(path = this.currentPath) {
      this.loading = true
      this.error = null
      
      try {
        const response = await axios.get(API_ENDPOINTS.list, {
          params: { path },
          headers: this.getHeaders()
        })
        
        this.currentPath = path
        this.selectedPath = path
        this.children = response.data.children || []
        
        return this.children
      } catch (error) {
        console.error('Failed to fetch folder children:', error)
        this.error = getErrorMessage(error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // Clear all state (for logout)
    clearState() {
      this.currentPath = '/'
      this.files = []
      this.children = []
      this.selectedFiles = []
      this.error = null
      this.selectedPath = null
      this.setAccessToken(null)
    }
  }
})