import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'lucide': ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})