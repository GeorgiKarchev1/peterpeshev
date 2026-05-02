import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../peterpeshev-main');
const DATA_FILE = path.join(ROOT, 'data.js');
const IMAGES_DIR = path.join(ROOT, 'images');
const CONFIG_FILE = path.join(__dirname, 'config.json');

// Load config (falls back to defaults if config.json doesn't exist yet)
const defaultConfig = { password: 'admin123', port: 3001 };
let config = { ...defaultConfig };
if (fs.existsSync(CONFIG_FILE)) {
    try { Object.assign(config, JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))); } catch {}
}

const sessions = new Set();

const app = express();
app.use(express.json({ limit: '10mb' }));

// Serve admin UI from this folder
app.use('/', express.static(__dirname));
// Serve project images so the admin panel can display thumbnails
app.use('/images', express.static(IMAGES_DIR));

// ------------------------------------
// AUTH MIDDLEWARE
// ------------------------------------
function requireAuth(req, res, next) {
    if (sessions.has(req.headers['x-auth-token'])) return next();
    res.status(401).json({ error: 'Unauthorized' });
}

// ------------------------------------
// AUTH ROUTES
// ------------------------------------
app.post('/api/login', (req, res) => {
    if (req.body.password === config.password) {
        const token = crypto.randomBytes(32).toString('hex');
        sessions.add(token);
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Невалидна парола' });
    }
});

app.post('/api/logout', requireAuth, (req, res) => {
    sessions.delete(req.headers['x-auth-token']);
    res.json({ ok: true });
});

// ------------------------------------
// PORTFOLIO DATA ROUTES
// ------------------------------------
function readData() {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const json = raw
        .replace(/^\s*const\s+portfolioData\s*=\s*/, '')
        .replace(/;\s*$/, '')
        .trim();
    return JSON.parse(json);
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, `const portfolioData = ${JSON.stringify(data, null, 4)};\n`);
}

app.get('/api/portfolio', requireAuth, (req, res) => {
    try { res.json(readData()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/portfolio', requireAuth, (req, res) => {
    try { writeData(req.body); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ------------------------------------
// IMAGE UPLOAD
// ------------------------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, IMAGES_DIR),
    filename: (req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase();
        const base = path.basename(file.originalname, path.extname(file.originalname))
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_\-\.]/g, '') || 'upload';
        let name = base + ext;
        if (fs.existsSync(path.join(IMAGES_DIR, name))) {
            name = `${base}_${Date.now()}${ext}`;
        }
        cb(null, name);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, /\.(jpe?g|png|gif|webp|svg)$/i.test(file.originalname))
});

app.post('/api/upload', requireAuth, upload.array('images', 100), (req, res) => {
    if (!req.files?.length) return res.status(400).json({ error: 'No valid images uploaded' });
    res.json({
        uploaded: req.files.map(f => ({ filename: f.filename, path: `images/${f.filename}` }))
    });
});

// ------------------------------------
// IMAGE MANAGEMENT
// ------------------------------------
app.get('/api/images', requireAuth, (req, res) => {
    const files = fs.readdirSync(IMAGES_DIR)
        .filter(f => /\.(jpe?g|png|gif|webp|svg)$/i.test(f))
        .sort((a, b) => {
            const statA = fs.statSync(path.join(IMAGES_DIR, a)).mtime;
            const statB = fs.statSync(path.join(IMAGES_DIR, b)).mtime;
            return statB - statA; // newest first
        });
    res.json(files);
});

app.delete('/api/images/:filename', requireAuth, (req, res) => {
    const fp = path.join(IMAGES_DIR, path.basename(req.params.filename));
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File not found' });
    fs.unlinkSync(fp);
    res.json({ ok: true });
});

// ------------------------------------
// SETTINGS
// ------------------------------------
app.post('/api/change-password', requireAuth, (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword?.trim()) return res.status(400).json({ error: 'Password required' });
    config.password = newPassword.trim();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    res.json({ ok: true });
});

// ------------------------------------
// START — auto-find free port
// ------------------------------------
function startServer(port) {
    const server = app.listen(port, () => {
        console.log(`\n  Admin panel: http://localhost:${port}`);
        console.log(`  Password: set in config.json\n`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`  Port ${port} is busy, trying ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error(err);
        }
    });
}

startServer(config.port);
