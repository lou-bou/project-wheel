import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // `npm run dev:api` runs the API on 3000
    proxy: { '/api': 'http://localhost:3000' },
  },
})
