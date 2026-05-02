import { kv } from '@vercel/kv';

// One-time endpoint to seed KV with portfolio data from the client.
// Call: POST /api/seed with the portfolioData JSON in the body.
// Protected by a seed secret stored in KV (or env var SEED_SECRET).
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const secret = process.env.SEED_SECRET || 'seed-me-once';
    if (req.headers['x-seed-secret'] !== secret) {
        return res.status(401).json({ error: 'Forbidden' });
    }

    const data = req.body;
    if (!data?.categories || !data?.items) {
        return res.status(400).json({ error: 'Invalid data: expected {categories, items}' });
    }

    await kv.set('portfolio', data);
    res.json({ ok: true, categories: data.categories.length, items: data.items.length });
}
