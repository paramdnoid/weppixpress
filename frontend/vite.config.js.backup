import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'store': path.resolve(__dirname, '../uploads')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
        quietDeps: true
      },
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})