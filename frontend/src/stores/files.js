import { defineStore } from 'pinia'
import axios from 'axios'

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
    accessToken: localStorage.getItem('accessToken') || null
  }),

  getters: {
    fileCount: (state) => state.files.length,
    selectedCount: (state) => state.selectedFiles.length,
  },

  actions: {
    async fetchFiles(path = this.currentPath) {
      this.loading = true
      this.error = null
      try {
        const res = await axios.get(`/files`, {
          params: { path },
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        })
        this.files = res.data.children
        this.currentPath = path
        this.breadcrumbs = path.split('/').filter(Boolean).map((name, i, arr) => ({
          name,
          path: '/' + arr.slice(0, i + 1).join('/'),
          isObject: true
        }))
      } catch (err) {
        this.error = err?.response?.data?.message || 'Failed to fetch files'
      } finally {
        this.loading = false
      }
    },

    async uploadFile(formData) {
      this.loading = true
      this.error = null
      try {
        formData.append('path', this.currentPath)
        await axios.post(`/api/files/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${this.accessToken}`
          },
        })
        await this.fetchFiles()
      } catch (err) {
        this.error = err?.response?.data?.message || 'Upload failed'
      } finally {
        this.loading = false
      }
    },

    async deleteFile(fileName) {
      try {
        await axios.delete(`/api/files`, {
          data: { path: this.currentPath, name: fileName },
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        })
        await this.fetchFiles()
      } catch (err) {
        this.error = err?.response?.data?.message || 'Delete failed'
      }
    },

    async refreshFiles() {
      return this.fetchFiles(this.currentPath);
    },

    selectFile(file) {
      if (!this.selectedFiles.includes(file)) {
        this.selectedFiles.push(file)
      }
    },

    deselectFile(file) {
      this.selectedFiles = this.selectedFiles.filter((f) => f !== file)
    },

    clearSelection() {
      this.selectedFiles = []
    },

    // Load children for a folder path without modifying the main file list
    async fetchFolderChildren(path = this.currentPath) {
      this.loading = true
      this.error = null
      try {
        const res = await axios.get(`/files`, {
          params: { path },
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        });
        this.breadcrumbs = path.split('/').filter(Boolean).map((name, i, arr) => ({
          name,
          path: '/' + arr.slice(0, i + 1).join('/'),
          isObject: true
        }))
        this.currentPath = path
        this.children = res.data.children
        
        return this.children;
      } catch (err) {
        this.error = err?.response?.data?.message || 'Failed to fetch files'
      } finally {
        this.loading = false
      }
    },
  },
})