import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist', assetsDir: 'assets', emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        fireStudioPreview: resolve(process.cwd(), 'fire-studio-preview.html')
      }
    }
  }
});
