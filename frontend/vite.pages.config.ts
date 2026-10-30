import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';

const frontendRoot = fileURLToPath(new URL('.', import.meta.url));
const srcRoot = path.join(frontendRoot, 'src');

// A separate static target: keep the API/Vinext/Sites build unchanged.
export default defineConfig({
  root: path.join(frontendRoot, 'demo'),
  base: '/KidsfitCRM/',
  publicDir: false,
  envDir: false,
  plugins: [react(), {
    name: 'emit-public-demo-brand-mark',
    generateBundle() {
      // Explicit allowlist: do not copy frontend/public or private workspace files wholesale.
      this.emitFile({type:'asset',fileName:'branding/kidsfit-mark.svg',source:readFileSync(path.join(frontendRoot,'public/branding/kidsfit-mark.svg'))});
    },
  }],
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: { alias: { '@': srcRoot } },
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
