import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      maxParallelFileOps: 2,
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts', 'd3-scale', 'd3-shape', 'd3-time'],
          'vendor-ui': ['framer-motion', 'react-toastify', 'lucide-react'],
          'vendor-utils': ['axios', 'moment', 'lodash'],
          'vendor-calendar': ['react-big-calendar'],
        },
      },
    },
  },
})
