import { kv } from '@vercel/kv';

async function requireAuth(req) {
    const token = req.headers['x-auth-token'];
    if (!token) return false;
    return !!(await kv.get(`session:${token}`));
}

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const data = await kv.get('portfolio');
        if (!data) return res.status(404).json({ error: 'No portfolio data. Run /api/seed first.' });
        return res.json(data);
    }

    if (req.method === 'POST') {
        if (!(await requireAuth(req))) return res.status(401).json({ error: 'Unauthorized' });
        await kv.set('portfolio', req.body);
        return res.json({ ok: true });
    }

    res.status(405).end();
}
