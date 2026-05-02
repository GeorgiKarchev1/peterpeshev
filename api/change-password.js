import { kv } from '@vercel/kv';

async function requireAuth(req) {
    const token = req.headers['x-auth-token'];
    if (!token) return false;
    return !!(await kv.get(`session:${token}`));
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    if (!(await requireAuth(req))) return res.status(401).json({ error: 'Unauthorized' });

    const { newPassword } = req.body || {};
    if (!newPassword?.trim()) return res.status(400).json({ error: 'Password required' });

    await kv.set('config:password', newPassword.trim());
    res.json({ ok: true });
}
