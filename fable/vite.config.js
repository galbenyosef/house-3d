import { defineConfig } from 'vite';
import { mkdirSync, createWriteStream } from 'node:fs';
import { resolve } from 'node:path';

// Dev-only endpoint used by the Blender panorama pipeline: the page exports the
// current scene as GLB and POSTs it here.
function exportEndpoint() {
  return {
    name: 'scene-export',
    configureServer(server) {
      const handler = (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('{"error":"POST only"}'); }
        const url = new URL(req.url, 'http://x');
        const name = (url.searchParams.get('name') || 'scene').replace(/[^a-z0-9_.-]/gi, '');
        const dir = resolve('.scratch/export');
        mkdirSync(dir, { recursive: true });
        const file = createWriteStream(resolve(dir, name));
        req.pipe(file);
        file.on('finish', () => { res.statusCode = 200; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: true, file: resolve(dir, name) })); });
      };
      server.middlewares.use('/__export', handler);
      server.middlewares.use('/maison/__export', handler);
    },
  };
}

// Served under a dedicated prefix on the production host (https://lyx666.cn/maison/).
export default defineConfig({
  base: '/maison/',
  server: { port: 5174, strictPort: true },
  build: { chunkSizeWarningLimit: 1500 },
  plugins: [exportEndpoint()],
});
