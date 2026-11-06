import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Cameos/',
  build: {
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'firebase-firestore', test: /node_modules[\\/]@firebase[\\/]firestore[\\/]/ },
            { name: 'firebase', test: /node_modules[\\/](?:@firebase|firebase)[\\/]/ },
            { name: 'react', test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/ },
          ],
        },
        assetFileNames: (assetInfo) =>
          assetInfo.names?.includes('app-icon.png') || assetInfo.name === 'app-icon.png'
            ? 'assets/[name][extname]'
            : 'assets/[name]-[hash][extname]',
      },
    },
  },
})
