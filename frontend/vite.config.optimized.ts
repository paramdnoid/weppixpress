/**
 * Optimized Vite Configuration
 * Best practices: Code splitting, caching, performance optimization, modern builds
 */

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { analyzer } from 'vite-bundle-analyzer'
import { createHtmlPlugin } from 'vite-plugin-html'
import { VitePWA } from 'vite-plugin-pwa'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'

  return {
    plugins: [
      vue({
        // Optimize Vue SFC compilation
        script: {
          defineModel: true,
          propsDestructure: true
        },
        template: {
          compilerOptions: {
            // Remove comments in production
            comments: !isProduction
          }
        }
      }),

      // HTML optimization
      createHtmlPlugin({
        minify: isProduction ? {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true,
          minifyCSS: true,
          minifyJS: true
        } : false,
        inject: {
          data: {
            title: env.VITE_APP_TITLE || 'WepPixpress',
            description: env.VITE_APP_DESCRIPTION || 'Modern file management platform',
            version: process.env.npm_package_version || '1.0.0'
          }
        }
      }),

      // Progressive Web App
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\./,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 // 24 hours
                }
              }
            }
          ]
        },
        manifest: {
          name: 'WepPixpress',
          short_name: 'WepPixpress',
          description: 'Modern file management platform',
          theme_color: '#3b82f6',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: '/icons/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icons/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      }),

      // Legacy browser support (only in production)
      ...(isProduction ? [
        legacy({
          targets: ['defaults', 'not IE 11']
        })
      ] : []),

      // Bundle analyzer (only when ANALYZE=true)
      ...(env.ANALYZE === 'true' ? [analyzer()] : [])
    ],

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '~': resolve(__dirname, 'node_modules')
      }
    },

    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/assets/styles/variables.scss";`
        }
      },
      devSourcemap: isDevelopment,
      // CSS code splitting
      modules: {
        localsConvention: 'camelCase'
      }
    },

    build: {
      target: 'esnext',
      outDir: 'dist',
      assetsDir: 'assets',
      minify: isProduction ? 'terser' : false,

      // Optimize chunks
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Vendor chunk for stable dependencies
            vendor: [
              'vue',
              'vue-router',
              'pinia',
              '@vueuse/core'
            ],

            // UI library chunk
            ui: [
              'bootstrap'
            ],

            // Utilities chunk
            utils: [
              'lodash-es',
              'date-fns',
              'axios'
            ],

            // Charts/visualization (if used)
            ...(env.VITE_ENABLE_CHARTS === 'true' && {
              charts: ['chart.js', 'vue-chartjs']
            })
          },

          // Asset naming for better caching
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
            if (facadeModuleId?.includes('node_modules')) {
              return 'vendor/[name].[hash].js'
            }
            return 'js/[name].[hash].js'
          },
          assetFileNames: (assetInfo) => {
            const extType = assetInfo.name?.split('.').pop()
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType ?? '')) {
              return 'img/[name].[hash][extname]'
            }
            if (/woff2?|eot|ttf|otf/i.test(extType ?? '')) {
              return 'fonts/[name].[hash][extname]'
            }
            if (extType === 'css') {
              return 'css/[name].[hash][extname]'
            }
            return 'assets/[name].[hash][extname]'
          }
        }
      },

      // Terser options for production
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.debug']
        },
        format: {
          comments: false
        }
      } : undefined,

      // Source maps
      sourcemap: isDevelopment ? 'inline' : false,

      // Chunk size warning limit
      chunkSizeWarningLimit: 1000,

      // Asset optimization
      assetsInlineLimit: 4096 // 4kb
    },

    server: {
      port: parseInt(env.VITE_PORT || '3000'),
      host: env.VITE_HOST || 'localhost',
      open: env.VITE_OPEN_BROWSER === 'true',

      // HMR configuration
      hmr: {
        overlay: true
      },

      // Proxy configuration
      proxy: env.VITE_API_URL ? {
        '/api': {
          target: env.VITE_API_URL,
          changeOrigin: true,
          secure: env.VITE_API_SECURE !== 'false'
        },
        '/socket.io': {
          target: env.VITE_WS_URL || env.VITE_API_URL,
          ws: true,
          changeOrigin: true
        }
      } : undefined
    },

    preview: {
      port: parseInt(env.VITE_PREVIEW_PORT || '4173'),
      host: env.VITE_HOST || 'localhost'
    },

    // Dependency optimization
    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'pinia',
        '@vueuse/core',
        'axios',
        'lodash-es'
      ],
      exclude: [
        // Exclude large dependencies that are better lazy-loaded
        'chart.js',
        'monaco-editor'
      ]
    },

    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __DEV__: isDevelopment,
      __PROD__: isProduction
    },

    // Environment variables
    envPrefix: 'VITE_',

    // Performance optimizations
    esbuild: {
      // Drop console and debugger in production
      drop: isProduction ? ['console', 'debugger'] : [],

      // Legal comments
      legalComments: 'none'
    }
  }
})