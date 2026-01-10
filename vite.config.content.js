import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  publicDir: false,
  resolve: {
    alias: {
      '@shared': resolve(root, 'src/shared'),
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  build: {
    outDir: resolve(root, 'dist/content'),
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(root, 'src/content/index.ts'),
      output: {
        format: 'iife',
        entryFileNames: 'index.js',
        assetFileNames: (asset) =>
          asset.name && asset.name.endsWith('.css') ? 'panel.css' : '[name][extname]',
        inlineDynamicImports: true,
      },
    },
  },
})
