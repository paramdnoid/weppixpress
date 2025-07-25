import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared'),
      'store': path.resolve(__dirname, '../uploads')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/assets/styles/custom.scss" as *;`,
        quietDeps: true
      },
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})