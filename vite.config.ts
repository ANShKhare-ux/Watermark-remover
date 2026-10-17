import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 30000, // OpenCV itself is ~28MB
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@techstark/opencv-js')) {
            return 'opencv';
          }
          if (id.includes('node_modules/@contentauth/c2pa-web')) {
            return 'c2pa';
          }
          if (id.includes('node_modules/@ffmpeg')) {
            return 'ffmpeg';
          }
          if (id.includes('node_modules/exifr')) {
            return 'exifr';
          }
        },
      },
    },
  },
})
