import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // ✅ Allows access via IP (0.0.0.0)
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
