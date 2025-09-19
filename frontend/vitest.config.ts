/**
 * Vitest Configuration
 * Best practices: Test environment setup, coverage, mocking, performance
 */

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '~': resolve(__dirname, 'node_modules')
    }
  },

  test: {
    // Test environment
    environment: 'jsdom',

    // Global setup
    globals: true,
    setupFiles: ['./src/test/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/.{idea,git,cache,output,temp}/**',
        // Exclude specific files
        'src/main.ts',
        'src/vite-env.d.ts',
        'src/workers/',
        // Exclude test utilities
        'src/utils/testing.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },

    // Test matching
    include: [
      'src/**/*.{test,spec}.{js,ts,vue}',
      'src/**/__tests__/**/*.{js,ts,vue}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.nuxt/',
      'coverage/'
    ],

    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,

    // Concurrent testing
    threads: true,
    maxThreads: 4,
    minThreads: 1,

    // Watch options
    watch: {
      exclude: ['node_modules/**', 'dist/**']
    },

    // Mocking
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,

    // Output
    outputFile: {
      json: './test-results.json',
      junit: './junit.xml'
    },

    // Reporters
    reporter: ['verbose', 'json', 'junit'],

    // Browser testing (optional)
    // browser: {
    //   enabled: false,
    //   name: 'chrome',
    //   provider: 'webdriverio'
    // },

    // Performance
    isolate: true,
    pool: 'threads',

    // UI (optional - for debugging)
    ui: false,

    // API (for programmatic access)
    api: {
      port: 51204,
      strictPort: true
    }
  },

  // Vite options for testing
  esbuild: {
    target: 'node14'
  },

  define: {
    // Define test-specific globals
    __TEST__: true,
    __DEV__: true,
    __PROD__: false
  }
})