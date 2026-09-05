import { defineConfig } from 'vite';

// Served under a dedicated prefix on the production host (https://lyx666.cn/maison/).
export default defineConfig({
  base: '/maison/',
  server: { port: 5174, strictPort: true },
  build: { chunkSizeWarningLimit: 1500 },
});
