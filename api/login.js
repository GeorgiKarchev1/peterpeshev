import { kv } from '@vercel/kv';
import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { password } = req.body || {};
    const storedPassword = (await kv.get('config:password')) || 'admin123';

    if (password !== storedPassword) {
        return res.status(401).json({ error: 'Невалидна парола' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await kv.set(`session:${token}`, 1, { ex: 86400 });

    res.json({ token });
}
