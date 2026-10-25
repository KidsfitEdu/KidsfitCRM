import { fileURLToPath } from 'node:url';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';

const frontendRoot = fileURLToPath(new URL('.', import.meta.url));

// A separate static target: keep the API/Vinext/Sites build unchanged.
export default defineConfig({
  root: path.join(frontendRoot, 'demo'),
  base: '/KidsfitCRM/',
  publicDir: false,
  envDir: false,
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: { alias: { '@': frontendRoot } },
  define: {
    'process.env.NEXT_PUBLIC_DEMO_MODE': JSON.stringify('true'),
    'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(''),
  },
  build: {
    outDir: path.join(frontendRoot, 'dist-pages'),
    emptyOutDir: true,
    sourcemap: false,
  },
});
