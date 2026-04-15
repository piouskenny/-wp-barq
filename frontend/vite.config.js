import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../assets/build'),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/main.jsx'),
    }
  },
  base: process.env.NODE_ENV === 'production' ? '/wp-content/plugins/wp_barq/assets/build/' : '/',
})
