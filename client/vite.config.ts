import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // 98.css uses @media (not(hover)) — disable CSS minification to avoid lightningcss parse error
    cssMinify: false,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      }
    }
  }
})
