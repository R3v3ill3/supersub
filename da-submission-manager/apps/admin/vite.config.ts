import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Ensure proper module resolution and prevent cross-app contamination
  optimizeDeps: {
    exclude: [],
  },
  build: {
    rollupOptions: {
      external: [],
    },
  },
})
