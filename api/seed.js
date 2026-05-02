import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

async function requireAuth(req) {
    const token = req.headers['x-auth-token'];
    if (!token) return false;
    return !!(await kv.get(`session:${token}`));
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    if (!(await requireAuth(req))) return res.status(401).json({ error: 'Unauthorized' });

    let text;
    try {
        const dataJsPath = path.join(process.cwd(), 'data.js');
        text = fs.readFileSync(dataJsPath, 'utf-8');
    } catch (e) {
        return res.status(500).json({ error: 'Cannot read data.js: ' + e.message });
    }

    let portfolioData;
    try {
        const json = text
            .replace(/^\s*(var|const|let)\s+portfolioData\s*=\s*/, '')
            .replace(/;\s*$/, '')
            .trim();
        portfolioData = JSON.parse(json);
    } catch (e) {
        return res.status(500).json({ error: 'Cannot parse data.js: ' + e.message });
    }

    if (!portfolioData?.categories || !portfolioData?.items) {
        return res.status(400).json({ error: 'Invalid data structure in data.js' });
    }

    await kv.set('portfolio', portfolioData);
    res.json({ ok: true, categories: portfolioData.categories.length, items: portfolioData.items.length });
}
