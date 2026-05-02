import { kv } from '@vercel/kv';
import { list, del } from '@vercel/blob';

async function requireAuth(req) {
    const token = req.headers['x-auth-token'];
    if (!token) return false;
    return !!(await kv.get(`session:${token}`));
}

export default async function handler(req, res) {
    if (!(await requireAuth(req))) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
        const { blobs } = await list();
        const images = blobs.map(b => ({ url: b.url, key: b.pathname }));
        return res.json(images);
    }

    if (req.method === 'DELETE') {
        const key = req.query.key;
        if (!key) return res.status(400).json({ error: 'key required' });

        const { blobs } = await list();
        const blob = blobs.find(b => b.pathname === key);
        if (!blob) return res.status(404).json({ error: 'Not found' });

        await del(blob.url);
        return res.json({ ok: true });
    }

    res.status(405).end();
}
