import { runHandler } from '../server/api.js';

export function makeVercelHandler(name) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const result = await runHandler(name, body);
      res.status(200).json(result);
    } catch (err) {
      console.error(`[api/${name}]`, err);
      res.status(err?.statusCode || 500).json({ error: err?.message || 'Internal error' });
    }
  };
}
