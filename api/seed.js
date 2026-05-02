import { kv } from '@vercel/kv';

async function requireAuth(req) {
    const token = req.headers['x-auth-token'];
    if (!token) return false;
    return !!(await kv.get(`session:${token}`));
}

// Seeds KV from the statically-served data.js on the same domain.
// Protected by admin auth token.
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    if (!(await requireAuth(req))) return res.status(401).json({ error: 'Unauthorized' });

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const dataJsUrl = `${protocol}://${host}/data.js`;

    const r = await fetch(dataJsUrl);
    if (!r.ok) return res.status(500).json({ error: `Could not fetch data.js: ${r.status}` });

    const text = await r.text();
    const json = text
        .replace(/^\s*var\s+portfolioData\s*=\s*/, '')
        .replace(/;\s*$/, '')
        .trim();

    let portfolioData;
    try { portfolioData = JSON.parse(json); } catch (e) {
        return res.status(500).json({ error: 'Could not parse data.js: ' + e.message });
    }

    if (!portfolioData?.categories || !portfolioData?.items) {
        return res.status(400).json({ error: 'Invalid data structure in data.js' });
    }

    await kv.set('portfolio', portfolioData);
    res.json({ ok: true, categories: portfolioData.categories.length, items: portfolioData.items.length });
}
