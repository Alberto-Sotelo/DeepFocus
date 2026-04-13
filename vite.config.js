import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// vite.config.js
export default {
  plugins: [react()],
  server: {
    host: true, // Expone en red local también
  },
}

