import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Cameos/',
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.names?.includes('app-icon.png') || assetInfo.name === 'app-icon.png'
            ? 'assets/[name][extname]'
            : 'assets/[name]-[hash][extname]',
      },
    },
  },
})
