import { kv } from '@vercel/kv';
import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

async function requireAuth(req) {
    const token = req.headers['x-auth-token'];
    if (!token) return false;
    return !!(await kv.get(`session:${token}`));
}

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    if (!(await requireAuth(req))) return res.status(401).json({ error: 'Unauthorized' });

    const form = formidable({ multiples: true, maxFileSize: 100 * 1024 * 1024 });

    const [, files] = await form.parse(req);
    const imageFiles = (files.images || []).filter(f => /\.(jpe?g|png|gif|webp|svg)$/i.test(f.originalFilename));

    if (!imageFiles.length) return res.status(400).json({ error: 'No valid images uploaded' });

    const uploaded = [];
    for (const file of imageFiles) {
        const ext = path.extname(file.originalFilename).toLowerCase();
        const base = path.basename(file.originalFilename, ext)
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_\-.]/g, '') || 'upload';
        const filename = `${base}_${Date.now()}${ext}`;

        const buffer = fs.readFileSync(file.filepath);
        const blob = await put(filename, buffer, { access: 'public' });
        uploaded.push({ filename, path: blob.url });
        fs.unlinkSync(file.filepath);
    }

    res.json({ uploaded });
}
