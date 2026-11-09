// بنك الحظ أونلاين: يقدّم ملفات اللعبة + يمرّر الرسائل بين اللاعبين داخل الغرف.
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const ROOT = __dirname, PORT = process.env.PORT || 3000;
const MAIN = 'بنك_الحظ.html';
const TYPES = { '.html': 'text/html; charset=utf-8', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.png': 'image/png', '.js': 'text/javascript', '.css': 'text/css', '.txt': 'text/plain; charset=utf-8' };
const PALETTE = ['#e94b4b', '#388fda', '#e6c13b', '#55ad68', '#9b68c9', '#ed8b3a'];

const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/' || p === '/index.html') p = '/' + MAIN;
  if (p === '/health') { res.writeHead(200); return res.end('ok'); }
  const file = path.normalize(path.join(ROOT, p));
  const allowed = p === '/' + MAIN || p.startsWith('/assets/');
  if (!file.startsWith(ROOT) || !allowed) { res.writeHead(404); return res.end('Not found'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (range) { // Range مطلوب للموسيقى الطويلة (تكرار/تقديم)
      const start = range[1] ? +range[1] : 0, end = range[2] ? Math.min(+range[2], st.size - 1) : st.size - 1;
      if (start > end || start >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': p.startsWith('/assets/') ? 'public, max-age=86400' : 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
});

const rooms = new Map();
const wss = new WebSocketServer({ server, maxPayload: 1 << 20 });
const send = (ws, m) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };
const pub = r => r.players.map(p => ({ seat: p.seat, name: p.name, color: p.color, online: !!p.ws }));
const bcast = (r, m, except) => r.players.forEach(p => { if (p.ws && p.ws !== except) send(p.ws, m); });
const cleanName = n => String(n || '').replace(/[<>]/g, '').trim().slice(0, 20) || 'لاعب';
const makeCode = () => { let c; do { c = Array.from({ length: 4 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.random() * 23 | 0]).join(''); } while (rooms.has(c)); return c; };
const token = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
function freeColor(r, want) { const used = new Set(r.players.map(p => p.color)); return PALETTE.includes(want) && !used.has(want) ? want : PALETTE.find(c => !used.has(c)); }
function addPlayer(r, ws, name, color) {
  const seat = r.nextSeat++, p = { seat, name: cleanName(name), color: freeColor(r, color), token: token(), ws };
  r.players.push(p); ws.room = r; ws.seat = seat; return p;
}
function schedule(r) { clearTimeout(r.timer); if (!r.players.some(p => p.ws)) r.timer = setTimeout(() => rooms.delete(r.code), 15 * 60 * 1000); }

wss.on('connection', ws => {
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const r = ws.room;
    if (m.t === 'ping') return;
    if (m.t === 'create') {
      const code = makeCode(), room = { code, players: [], nextSeat: 0, started: false, order: [], turn: undefined, state: null };
      rooms.set(code, room); const p = addPlayer(room, ws, m.name, m.color);
      return send(ws, { t: 'joined', code, seat: p.seat, token: p.token, host: 0, players: pub(room) });
    }
    if (m.t === 'join') {
      const room = rooms.get(String(m.code || '').toUpperCase().trim());
      if (!room) return send(ws, { t: 'error', msg: 'الغرفة غير موجودة. راجع الكود.' });
      if (room.started) return send(ws, { t: 'error', msg: 'اللعبة بدأت بالفعل في هذه الغرفة.' });
      if (room.players.length >= 6) return send(ws, { t: 'error', msg: 'الغرفة ممتلئة (٦ لاعبين).' });
      const p = addPlayer(room, ws, m.name, m.color);
      send(ws, { t: 'joined', code: room.code, seat: p.seat, token: p.token, host: 0, players: pub(room) });
      return bcast(room, { t: 'lobby', players: pub(room) }, ws);
    }
    if (m.t === 'rejoin') {
      const room = rooms.get(String(m.code || '').toUpperCase()), p = room && room.players.find(x => x.token === m.token);
      if (!p) return send(ws, { t: 'error', msg: 'تعذّر الرجوع للغرفة.', fatal: true });
      if (p.ws && p.ws !== ws) try { p.ws.close(); } catch {}
      p.ws = ws; ws.room = room; ws.seat = p.seat; clearTimeout(room.timer);
      send(ws, { t: 'joined', code: room.code, seat: p.seat, token: p.token, host: 0, players: pub(room), rejoin: true });
      if (room.started) { send(ws, { t: 'start', players: room.order, resume: true }); if (room.state) send(ws, { t: 'state', state: room.state }); }
      return bcast(room, { t: 'lobby', players: pub(room) }, ws);
    }
    if (!r) return;
    if (m.t === 'start') {
      if (ws.seat !== r.players[0].seat || r.started) return;
      if (r.players.length < 2) return send(ws, { t: 'error', msg: 'لازم لاعبين على الأقل.' });
      r.started = true; r.order = pub(r);
      return bcast(r, { t: 'start', players: r.order });
    }
    if (m.t === 'state') {
      if (!r.started || !m.state || !Array.isArray(m.state.players)) return;
      const idx = r.order.findIndex(p => p.seat === ws.seat), owner = r.turn === undefined ? 0 : r.turn;
      if (idx !== owner) return; // فقط صاحب الدور يعدّل الحالة
      r.turn = m.state.turn; r.state = m.state;
      return bcast(r, { t: 'state', state: m.state }, ws);
    }
    if (m.t === 'chat' && m.entry) {
      const e = { kind: 'message', playerId: r.order.findIndex(p => p.seat === ws.seat), playerName: String(m.entry.playerName || '').slice(0, 20), color: m.entry.color, text: String(m.entry.text || '').slice(0, 240), time: m.entry.time || Date.now() };
      return bcast(r, { t: 'chat', entry: e }, ws);
    }
  });
  ws.on('close', () => {
    const r = ws.room; if (!r) return;
    const i = r.players.findIndex(p => p.seat === ws.seat); if (i < 0) return;
    if (!r.started) {
      if (i === 0) { bcast(r, { t: 'error', msg: 'صاحب الغرفة خرج، تم إغلاق الغرفة.', fatal: true }, ws); rooms.delete(r.code); return; }
      r.players.splice(i, 1);
    } else if (r.players[i].ws === ws) r.players[i].ws = null;
    bcast(r, { t: 'lobby', players: pub(r) }); schedule(r);
  });
});
setInterval(() => wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }), 30000);
server.listen(PORT, () => console.log(`بنك الحظ يعمل على http://localhost:${PORT}`));
