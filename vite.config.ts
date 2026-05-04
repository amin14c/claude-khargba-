import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir:       'dist',
    sourcemap:    false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          react:    ['react', 'react-dom'],
          motion:   ['motion'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
