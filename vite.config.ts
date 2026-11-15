import { defineConfig } from 'vite';

// es2022 for top-level await in main.ts; three.js alone is ~500 kB
export default defineConfig({ build: { target: 'es2022', chunkSizeWarningLimit: 700 } });
