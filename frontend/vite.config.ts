import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
<<<<<<< HEAD
        target: 'http://localhost:54773',
=======
        target: 'http://localhost:49292',
>>>>>>> f3759bd (initial commit)
        changeOrigin: true,
      },
    },
  },
})
