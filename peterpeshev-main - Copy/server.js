import express  from 'express';
import multer   from 'multer';
import path     from 'path';
import fs       from 'fs';
import crypto   from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3002;
const ROOT = __dirname;

// ── File paths ────────────────────────────────────────────
const CONFIG_FILE  = path.join(ROOT, 'admin-config.json');
const DATA_JS_FILE = path.join(ROOT, 'data.js');
const DATA_FILE    = path.join(ROOT, 'data.json');
const IMAGES_DIR   = path.join(ROOT, 'images');

// ── Config helpers ────────────────────────────────────────
function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
    const config = { password: 'admin2024' };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log('Created admin-config.json with default password: admin2024');
    return config;
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ── Portfolio data helpers ────────────────────────────────
function loadPortfolioData() {
    if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    // Parse existing data.js
    const raw = fs.readFileSync(DATA_JS_FILE, 'utf8');
    const match = raw.match(/const portfolioData\s*=\s*(\{[\s\S]*?\});\s*$/m)
               || raw.match(/const portfolioData\s*=\s*(\{[\s\S]*\})/);
    if (match) {
        try {
            return JSON.parse(match[1]);
        } catch (e) {
            console.error('Failed to parse data.js:', e.message);
        }
    }
    return { categories: [], items: [], aboutSlider: [] };
}

function savePortfolioData(data) {
    // Save as JSON for fast server reads
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    // Regenerate data.js so the main site always has latest data
    const js = `const portfolioData = ${JSON.stringify(data, null, 4)};\n`;
    fs.writeFileSync(DATA_JS_FILE, js);
}

// ── In-memory auth tokens ─────────────────────────────────
const activeTokens = new Set();

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// ── Middleware ────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));

function requireAuth(req, res, next) {
    const token = req.headers['x-auth-token'];
    if (!token || !activeTokens.has(token)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// ── Image upload ──────────────────────────────────────────
const storage = multer.diskStorage({
    destination: IMAGES_DIR,
    filename: (req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase();
        const base = path.basename(file.originalname, ext)
                        .replace(/[^a-zA-Z0-9_-]/g, '_')
                        .substring(0, 60);
        cb(null, `${Date.now()}_${base}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (/image\/(jpeg|jpg|png|webp|gif)/i.test(file.mimetype)) cb(null, true);
        else cb(new Error('Only image files allowed'));
    }
});

// ── API routes ────────────────────────────────────────────

app.post('/api/login', (req, res) => {
    const { password } = req.body || {};
    const config = loadConfig();
    if (password && password === config.password) {
        const token = generateToken();
        activeTokens.add(token);
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

app.post('/api/logout', requireAuth, (req, res) => {
    activeTokens.delete(req.headers['x-auth-token']);
    res.json({ ok: true });
});

app.get('/api/portfolio', requireAuth, (req, res) => {
    try {
        res.json(loadPortfolioData());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/portfolio', requireAuth, (req, res) => {
    try {
        savePortfolioData(req.body);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/upload', requireAuth, upload.array('images'), (req, res) => {
    if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });
    const uploaded = req.files.map(f => ({
        path: 'images/' + f.filename,
        filename: f.filename
    }));
    res.json({ uploaded });
});

app.get('/api/images', requireAuth, (req, res) => {
    try {
        const files = fs.readdirSync(IMAGES_DIR)
            .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
            .sort();
        res.json(files);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/images/:filename', requireAuth, (req, res) => {
    const filename = req.params.filename;
    // Block path traversal attempts
    if (!filename || /[/\\]|\.\./.test(filename)) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    const filepath = path.join(IMAGES_DIR, filename);
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    fs.unlinkSync(filepath);
    res.json({ ok: true });
});

app.post('/api/change-password', requireAuth, (req, res) => {
    const { newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const config = loadConfig();
    config.password = newPassword;
    saveConfig(config);
    res.json({ ok: true });
});

// ── HTML routes (before static so /admin isn't intercepted) ──

app.get('/',          (req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('/portfolio', (req, res) => res.sendFile(path.join(ROOT, 'portfolio.html')));
app.get('/about',     (req, res) => res.sendFile(path.join(ROOT, 'about.html')));

// /admin → admin panel (peterpeshev-admin takes priority)
app.get('/admin', (req, res) => {
    const primary  = path.join(ROOT, 'peterpeshev-admin', 'index.html');
    const fallback = path.join(ROOT, 'admin', 'index.html');
    res.sendFile(fs.existsSync(primary) ? primary : fallback);
});

// ── Static files ──────────────────────────────────────────
app.use(express.static(ROOT, { index: false, redirect: false }));

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
    const config = loadConfig();
    console.log('');
    console.log('  Петър Пешев — Server started');
    console.log(`  Site:   http://localhost:${PORT}`);
    console.log(`  Admin:  http://localhost:${PORT}/admin`);
    console.log(`  Password: ${config.password}`);
    console.log('');
});
