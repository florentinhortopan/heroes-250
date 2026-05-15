import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

function apiMiddlewarePlugin() {
  return {
    name: 'api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();

        const endpoint = req.url.replace(/^\/api\//, '').split('?')[0].replace(/\/$/, '');

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const { runHandler } = await server.ssrLoadModule('/server/api.js');
          const body = await readJsonBody(req);
          const result = await runHandler(endpoint, body);
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err) {
          console.error(`[api/${endpoint}]`, err);
          const status = err?.statusCode || 500;
          res.statusCode = status;
          res.setHeader('content-type', 'application/json');
          res.end(
            JSON.stringify({
              error: err?.message || 'Internal error',
            }),
          );
        }
      });
    },
  };
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

export default defineConfig({
  plugins: [react(), apiMiddlewarePlugin()],
});
