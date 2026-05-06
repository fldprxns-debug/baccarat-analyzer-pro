require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const db = new sqlite3.Database(path.join(__dirname, 'baccarat.sqlite'));

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS analyzer_state (
    user_id INTEGER PRIMARY KEY,
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});

function sign(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: '로그인이 만료되었거나 올바르지 않습니다.' });
  }
}

app.post('/api/register', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (username.length < 3) return res.status(400).json({ error: '사용자명은 3자 이상이어야 합니다.' });
  if (password.length < 6) return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
  const hash = bcrypt.hashSync(password, 12);
  const createdAt = new Date().toISOString();
  db.run('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)', [username, hash, createdAt], function(err) {
    if (err) return res.status(409).json({ error: '이미 존재하는 사용자명입니다.' });
    const user = { id: this.lastID, username };
    res.json({ token: sign(user), username });
  });
});

app.post('/api/login', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
    res.json({ token: sign(user), username: user.username });
  });
});

app.get('/api/state', auth, (req, res) => {
  db.get('SELECT state_json, updated_at FROM analyzer_state WHERE user_id = ?', [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: '저장 데이터를 불러오지 못했습니다.' });
    if (!row) return res.json({ state: null });
    try {
      res.json({ state: JSON.parse(row.state_json), updatedAt: row.updated_at });
    } catch {
      res.status(500).json({ error: '저장 데이터가 손상되었습니다.' });
    }
  });
});

app.post('/api/state', auth, (req, res) => {
  const state = req.body.state;
  if (!state || !Array.isArray(state.results)) return res.status(400).json({ error: '저장할 데이터 형식이 올바르지 않습니다.' });
  const cleanState = {
    ...state,
    results: state.results.filter(x => ['B', 'P', 'T'].includes(x)),
    predictions: Array.isArray(state.predictions) ? state.predictions : [],
    updatedAt: new Date().toISOString()
  };
  const json = JSON.stringify(cleanState);
  const updatedAt = cleanState.updatedAt;
  db.run(`INSERT INTO analyzer_state (user_id, state_json, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at`,
    [req.user.id, json, updatedAt],
    err => {
      if (err) return res.status(500).json({ error: '서버 저장에 실패했습니다.' });
      res.json({ ok: true, updatedAt });
    }
  );
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Baccarat Analyzer server running on http://localhost:${PORT}`);
});
