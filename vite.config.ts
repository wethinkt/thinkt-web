/**
 * Vite Configuration for THINKT Web
 *
 * Standalone webapp for the THINKT API browser.
 * Designed to be embedded by the Go `thinkt serve` command.
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';
import { lingui } from '@lingui/vite-plugin';

export default defineConfig({
  root: '.',
  plugins: [lingui()],

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,

    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        // No content hashes — assets are embedded in the Go binary at compile time,
        // so there's no CDN/browser cache to bust. Stable names keep go:embed simple.
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') ?? [];
          const ext = info[info.length - 1] ?? '';
          if (/png|jpe?g|svg|gif|tiff?|bmp|ico$/i.test(ext)) {
            return 'assets/images/[name][extname]';
          }
          if (/css$/i.test(ext)) {
            return 'assets/styles/[name][extname]';
          }
          return 'assets/[name][extname]';
        },
      },
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  css: {
    devSourcemap: true,
  },

  server: {
    port: 7434,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8784',
        changeOrigin: true,
      },
    },
  },

  preview: {
    port: 7435,
    open: true,
  },

  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0'),
  },
});
