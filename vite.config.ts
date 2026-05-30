import zlib from 'node:zlib'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { compression, defineAlgorithm } from 'vite-plugin-compression2'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    UnoCSS(),
    react(),
    // Emit .br (brotli q11) and .gz (level 9) alongside assets at build time, so
    // nginx serves them via brotli_static/gzip_static with zero per-request CPU.
    // Originals are kept for clients that support neither.
    compression({
      threshold: 1024,
      skipIfLargerOrEqual: true,
      algorithms: [
        defineAlgorithm('brotliCompress', {
          params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
        }),
        defineAlgorithm('gzip', { level: 9 }),
      ],
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split large, rarely-changing vendor libs into their own chunks so they
        // cache independently and stay out of the per-page bundles.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
          charts: ['recharts'],
        },
      },
    },
  },
})
