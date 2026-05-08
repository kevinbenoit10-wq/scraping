/**
 * TABLE MODE — Backend additions for ~/backend/server.js on the VPS
 *
 * STEP 1: Install socket.io
 *   npm install socket.io
 *
 * STEP 2: Replace the server creation and add all code below.
 *         Find the line: const app = express();
 *         Replace the whole server setup with the code below.
 */

// ─── REPLACE from "const app = express();" until "app.listen(...)" ────────────

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// ─── Keep all your existing routes (rate limiting, /parse-receipt, etc.) ──────
// ... (your existing code stays here, unchanged) ...

// ─── NEW: Session storage (in-memory, max 2 hours) ────────────────────────────
const sessions = new Map();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Clean up sessions older than 2 hours
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [code, session] of sessions.entries()) {
    if (session.createdAt < cutoff) sessions.delete(code);
  }
}, 30 * 60 * 1000);

// ─── NEW: Web join page for guests ────────────────────────────────────────────
app.get('/join/:code', (req, res) => {
  const { code } = req.params;
  const apiUrl = process.env.API_URL || 'https://api.splitr.eu';

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Splitr — Join split</title>
  <script src="${apiUrl}/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9ff; min-height: 100vh; }
    .header { background: linear-gradient(135deg, #667eea, #764ba2); padding: 24px 20px; color: #fff; }
    .header h1 { font-size: 22px; font-weight: 800; }
    .header p { font-size: 13px; opacity: 0.8; margin-top: 4px; }
    .container { padding: 20px; max-width: 480px; margin: 0 auto; }
    .card { background: #fff; border-radius: 16px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .label { font-size: 11px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    input { width: 100%; border: 1.5px solid #e0e0e0; border-radius: 12px; padding: 12px 16px; font-size: 16px; outline: none; transition: border-color 0.2s; }
    input:focus { border-color: #667eea; }
    .btn { width: 100%; background: #667eea; color: #fff; border: none; border-radius: 30px; padding: 14px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 12px; }
    .btn:active { opacity: 0.85; }
    .btn-secondary { background: #f0f0f0; color: #555; margin-top: 8px; }
    .item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f5f5f5; }
    .item:last-child { border-bottom: none; }
    .item-name { font-size: 14px; font-weight: 600; color: #1a1a2e; }
    .item-price { font-size: 13px; color: #888; margin-top: 2px; }
    .claim-btn { padding: 6px 14px; border-radius: 20px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; }
    .claim-btn.unclaimed { background: #f0f0f0; color: #888; }
    .claim-btn.mine { background: #e8f5e9; color: #2ecc71; }
    .claim-btn.other { background: #f5f5f5; color: #ccc; cursor: default; font-size: 12px; }
    .progress { background: #667eea; color: #fff; border-radius: 12px; padding: 12px 16px; text-align: center; font-weight: 700; margin-bottom: 16px; }
    .notice { font-size: 12px; color: #bbb; text-align: center; margin-top: 12px; }
    #nameScreen, #claimScreen { }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧾 Splitr</h1>
    <p>Session ${code}</p>
  </div>

  <div class="container">
    <div id="nameScreen">
      <div class="card">
        <div class="label">Your name</div>
        <input id="nameInput" type="text" placeholder="Enter your name..." maxlength="20" />
        <button class="btn" onclick="joinSession()">Join split →</button>
      </div>
      <p class="notice">Your name and order are deleted after 2 hours</p>
    </div>

    <div id="claimScreen" class="hidden">
      <div class="progress" id="progressText">0/0 items claimed</div>
      <div class="card">
        <div class="label">Tap your items</div>
        <div id="itemsList"></div>
      </div>
      <p class="notice">Tap an item to claim it. Tap again to unclaim.</p>
    </div>
  </div>

  <script>
    const socket = io('${apiUrl}', { transports: ['websocket'] });
    const CODE = '${code}';
    let myName = '';
    let sessionItems = [];
    let sessionClaims = {};

    function joinSession() {
      const name = document.getElementById('nameInput').value.trim();
      if (!name) return;
      myName = name;
      socket.emit('join_session', { code: CODE, name });
    }

    socket.on('session_state', ({ items, claims }) => {
      sessionItems = items;
      sessionClaims = claims;
      document.getElementById('nameScreen').classList.add('hidden');
      document.getElementById('claimScreen').classList.remove('hidden');
      renderItems();
    });

    socket.on('session_update', ({ claims }) => {
      sessionClaims = claims;
      renderItems();
    });

    socket.on('error', (msg) => {
      alert('Error: ' + msg);
    });

    function claimItem(itemId) {
      if (sessionClaims[itemId] && sessionClaims[itemId] !== myName) return;
      if (sessionClaims[itemId] === myName) {
        socket.emit('unclaim_item', { code: CODE, itemId });
      } else {
        socket.emit('claim_item', { code: CODE, itemId, name: myName });
      }
    }

    function renderItems() {
      const list = document.getElementById('itemsList');
      const claimed = Object.keys(sessionClaims).length;
      document.getElementById('progressText').textContent = claimed + '/' + sessionItems.length + ' items claimed';

      list.innerHTML = sessionItems.map(item => {
        const claimedBy = sessionClaims[item.id];
        const isMine = claimedBy === myName;
        const isOther = claimedBy && !isMine;

        return '<div class="item">' +
          '<div>' +
            '<div class="item-name">' + item.name + '</div>' +
            '<div class="item-price">' + item.totalPrice.toFixed(2) + '</div>' +
          '</div>' +
          '<button class="claim-btn ' + (isMine ? 'mine' : isOther ? 'other' : 'unclaimed') + '" ' +
            (isOther ? '' : 'onclick="claimItem(\'' + item.id + '\')"') + '>' +
            (isMine ? '✓ Mine' : isOther ? claimedBy : 'Claim') +
          '</button>' +
        '</div>';
      }).join('');
    }

    document.getElementById('nameInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') joinSession();
    });
  </script>
</body>
</html>`);
});

// ─── NEW: Socket.io events ────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('create_session', ({ items }) => {
    const code = generateCode();
    sessions.set(code, {
      items,
      claims: {},
      participants: [],
      createdAt: Date.now(),
    });
    socket.join(code);
    socket.data.code = code;
    socket.emit('session_created', { code });
  });

  socket.on('join_session', ({ code, name }) => {
    const session = sessions.get(code);
    if (!session) {
      socket.emit('error', 'Session not found');
      return;
    }
    socket.join(code);
    socket.data.code = code;
    socket.data.name = name;
    if (!session.participants.includes(name)) {
      session.participants.push(name);
    }
    socket.emit('session_state', { items: session.items, claims: session.claims });
    io.to(code).emit('session_update', {
      claims: session.claims,
      participants: session.participants,
    });
  });

  socket.on('claim_item', ({ code, itemId, name }) => {
    const session = sessions.get(code);
    if (!session || session.claims[itemId]) return;
    session.claims[itemId] = name;
    io.to(code).emit('session_update', {
      claims: session.claims,
      participants: session.participants,
    });
  });

  socket.on('unclaim_item', ({ code, itemId }) => {
    const session = sessions.get(code);
    if (!session) return;
    delete session.claims[itemId];
    io.to(code).emit('session_update', {
      claims: session.claims,
      participants: session.participants,
    });
  });

  socket.on('close_session', ({ code, summaries }) => {
    const session = sessions.get(code);
    if (!session) return;
    // Keep session alive for 2h (auto-cleanup handles deletion)
    // but mark as closed and store summaries so guests can see their total
    session.closed = true;
    session.summaries = summaries || [];
    io.to(code).emit('session_closed', { summaries: session.summaries });
  });
});

// ─── REPLACE app.listen with server.listen ────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
