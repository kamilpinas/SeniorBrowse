import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  publicDir: false,
  resolve: {
    alias: {
      '@shared': resolve(root, 'src/shared'),
    },
  },
  build: {
    outDir: resolve(root, 'dist/background'),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(root, 'src/background/service-worker.ts'),
      output: {
        format: 'es',
        entryFileNames: 'service-worker.js',
        inlineDynamicImports: true,
      },
    },
  },
})
