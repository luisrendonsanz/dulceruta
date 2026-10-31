import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// GitHub Actions proporciona VITE_BASE_PATH como /nombre-del-repo/.
// Se puede cambiar a / si se publica en usuario.github.io.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        register: resolve(import.meta.dirname, 'registro.html'),
        editor: resolve(import.meta.dirname, 'editor.html'),
        privacy: resolve(import.meta.dirname, 'privacidad.html'),
        report: resolve(import.meta.dirname, 'reportar.html'),
      },
    },
  },
});
