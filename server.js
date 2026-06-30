const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');

const DATA_FILE = path.join(__dirname, 'data.json');
const JWT_SECRET = 'change-this-secret-before-production';
const PORT = process.env.PORT || 4000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function createInitialData() {
  return {
    users: [],
    rooms: ['general'],
    messages: []
  };
}

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(createInitialData(), null, 2));
  }
  try {
    const json = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(json);
  } catch (err) {
    console.error('Error loading data file:', err);
    return createInitialData();
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const data = loadData();
const connections = new Map();

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '12h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function getActiveUsers() {
  const active = new Set();
  for (const client of connections.values()) {
    active.add(client.username);
  }
  return Array.from(active);
}

function broadcast(payload) {
  const message = JSON.stringify(payload);
  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

function sendTo(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function sendRoomMessage(room, messageData) {
  for (const [client, meta] of connections.entries()) {
    if (meta.room === room && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(messageData));
    }
  }
}

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const existingUser = data.users.find(u => u.username === username);
  if (existingUser) {
    return res.status(409).json({ error: 'Username already exists.' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), username, passwordHash: hashed };
  data.users.push(user);
  saveData();

  return res.json({ token: generateToken(user), username: user.username });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = data.users.find(u => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  return res.json({ token: generateToken(user), username: user.username });
});

app.get('/api/rooms', (req, res) => {
  res.json({ rooms: data.rooms, online: getActiveUsers() });
});

app.post('/api/rooms', (req, res) => {
  const { room } = req.body;
  if (!room || typeof room !== 'string') {
    return res.status(400).json({ error: 'Room name is required.' });
  }
  if (!data.rooms.includes(room)) {
    data.rooms.push(room);
    saveData();
    broadcast({ type: 'room_list', rooms: data.rooms });
  }
  res.json({ rooms: data.rooms });
});

app.get('/api/history', (req, res) => {
  const room = req.query.room || 'general';
  const history = data.messages
    .filter(msg => msg.room === room || msg.privateChat)
    .slice(-100);
  res.json({ room, history });
});

wss.on('connection', (ws, req) => {
  const params = new URLSearchParams(req.url.replace(/^\/?\?/, ''));
  const token = params.get('token');
  const room = params.get('room') || 'general';
  const payload = verifyToken(token);

  if (!payload) {
    ws.close(1008, 'Authentication required');
    return;
  }

  connections.set(ws, { id: payload.id, username: payload.username, room });
  const userJoined = { type: 'presence', online: getActiveUsers() };
  broadcast(userJoined);
  sendTo(ws, { type: 'joined', room, username: payload.username });

  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      const clientMeta = connections.get(ws);
      if (!clientMeta) return;

      if (message.type === 'join_room') {
        clientMeta.room = message.room || 'general';
        sendTo(ws, { type: 'joined', room: clientMeta.room, username: clientMeta.username });
      }

      if (message.type === 'new_room' && message.room) {
        if (!data.rooms.includes(message.room)) {
          data.rooms.push(message.room);
          saveData();
          broadcast({ type: 'room_list', rooms: data.rooms });
        }
      }

      if (message.type === 'message') {
        const chatMessage = {
          id: uuidv4(),
          room: clientMeta.room,
          username: clientMeta.username,
          text: message.text,
          timestamp: new Date().toISOString()
        };
        data.messages.push(chatMessage);
        saveData();
        sendRoomMessage(clientMeta.room, { type: 'message', message: chatMessage });
      }

      if (message.type === 'private_message' && message.target) {
        const targetUser = message.target;
        const privateMessage = {
          id: uuidv4(),
          privateChat: [clientMeta.username, targetUser].sort().join(':'),
          from: clientMeta.username,
          to: targetUser,
          text: message.text,
          timestamp: new Date().toISOString()
        };
        data.messages.push(privateMessage);
        saveData();

        for (const [client, meta] of connections.entries()) {
          if (client.readyState !== WebSocket.OPEN) continue;
          if (meta.username === targetUser || meta.username === clientMeta.username) {
            client.send(JSON.stringify({ type: 'private_message', message: privateMessage }));
          }
        }
      }
    } catch (err) {
      console.error('WebSocket error:', err);
    }
  });

  ws.on('close', () => {
    connections.delete(ws);
    broadcast({ type: 'presence', online: getActiveUsers() });
  });
});

server.listen(PORT, () => {
  console.log(`Chat server is running on http://localhost:${PORT}`);
});
