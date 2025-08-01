import { defineStore } from 'pinia'
import axios from 'axios'

export const useFileStore = defineStore('file', {
  state: () => ({
    currentPath: '/',
    files: [],
    loading: false,
    error: null,
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
        this.breadcrumbs = path.split('/').filter(Boolean)
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
    async loadChildrenForPath(path) {
      try {
        const res = await axios.get(`/files`, {
          params: { path },
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        });
        this.currentPath = path
        this.breadcrumbs = path.split('/').filter(Boolean)
        return res.data.children;
      } catch (err) {
        this.error = err?.response?.data?.message || 'Failed to load folder';
        return [];
      }
    },
  },
})