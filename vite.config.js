import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: resolve(root, 'src'),
  publicDir: resolve(root, 'public'),
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(root, 'src/shared'),
    },
  },
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index:     resolve(root, 'src/index.html'),
        newtab:    resolve(root, 'src/newtab/index.html'),
        admin:     resolve(root, 'src/admin/index.html'),
        sidepanel: resolve(root, 'src/sidepanel/index.html'),
      },
    },
  },
})
