const authPanel = document.getElementById('authPanel');
const chatPanel = document.getElementById('chatPanel');
const chatWindow = document.getElementById('chatWindow');
const welcome = document.getElementById('welcome');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const authError = document.getElementById('authError');
const roomsList = document.getElementById('rooms');
const usersList = document.getElementById('users');
const newRoomInput = document.getElementById('newRoomInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const sendBtn = document.getElementById('sendBtn');
const messageInput = document.getElementById('messageInput');
const messagesContainer = document.getElementById('messages');
const roomTitle = document.getElementById('roomTitle');
const statusText = document.getElementById('statusText');
const currentUserLabel = document.getElementById('currentUser');

let token = null;
let username = null;
let currentRoom = 'general';
let websocket = null;

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  return response.json();
}

function setError(message) {
  authError.textContent = message;
}

async function authenticate(endpoint) {
  setError('');
  const body = {
    username: usernameInput.value.trim(),
    password: passwordInput.value.trim()
  };
  if (!body.username || !body.password) {
    setError('Enter a username and password.');
    return;
  }

  const result = await request(`/api/${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(body)
  });

  if (result.error) {
    setError(result.error);
    return;
  }

  token = result.token;
  username = result.username;
  currentUserLabel.textContent = username;
  showChat();
}

function showChat() {
  authPanel.classList.add('hidden');
  chatPanel.classList.remove('hidden');
  welcome.classList.add('hidden');
  chatWindow.classList.remove('hidden');
  connectSocket();
  loadRooms();
}

function addMessage(message) {
  const element = document.createElement('div');
  element.className = 'message';
  element.innerHTML = `<strong>${message.username || message.from}</strong> <span class="meta">${new Date(message.timestamp).toLocaleTimeString()}</span><div>${message.text}</div>`;
  messagesContainer.appendChild(element);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function loadRooms() {
  const result = await request('/api/rooms');
  if (result.rooms) {
    roomsList.innerHTML = '';
    result.rooms.forEach(room => {
      const item = document.createElement('li');
      item.textContent = room;
      item.className = room === currentRoom ? 'active' : '';
      item.onclick = () => joinRoom(room);
      roomsList.appendChild(item);
    });
  }
  if (result.online) {
    usersList.innerHTML = '';
    result.online.forEach(user => {
      const item = document.createElement('li');
      item.textContent = user;
      item.onclick = () => startPrivateChat(user);
      usersList.appendChild(item);
    });
  }
}

function joinRoom(room) {
  currentRoom = room;
  roomTitle.textContent = `Room: ${room}`;
  loadHistory(room);
  websocket.send(JSON.stringify({ type: 'join_room', room }));
  Array.from(roomsList.children).forEach(li => li.classList.toggle('active', li.textContent === room));
}

async function loadHistory(room) {
  messagesContainer.innerHTML = '';
  const result = await request(`/api/history?room=${encodeURIComponent(room)}`);
  if (result.history) {
    result.history.forEach(addMessage);
  }
}

function startPrivateChat(target) {
  if (target === username) return;
  currentRoom = `private:${target}`;
  roomTitle.textContent = `Private chat with ${target}`;
  messagesContainer.innerHTML = '';
}

function connectSocket() {
  websocket = new WebSocket(`${location.origin.replace(/^http/, 'ws')}?token=${encodeURIComponent(token)}&room=${encodeURIComponent(currentRoom)}`);

  websocket.onopen = () => {
    statusText.textContent = `Connected as ${username}`;
  };

  websocket.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    if (payload.type === 'message') {
      addMessage(payload.message);
    }
    if (payload.type === 'private_message') {
      if (payload.message.to === username || payload.message.from === username) {
        addMessage({ username: `${payload.message.from} → ${payload.message.to}`, text: payload.message.text, timestamp: payload.message.timestamp });
      }
    }
    if (payload.type === 'presence') {
      renderPresence(payload.online);
    }
    if (payload.type === 'room_list') {
      loadRooms();
    }
  };

  websocket.onclose = () => {
    statusText.textContent = 'Disconnected. Refresh to reconnect.';
  };
}

function renderPresence(online) {
  usersList.innerHTML = '';
  online.forEach(user => {
    const item = document.createElement('li');
    item.textContent = user;
    item.onclick = () => startPrivateChat(user);
    usersList.appendChild(item);
  });
}

loginBtn.addEventListener('click', () => authenticate('login'));
registerBtn.addEventListener('click', () => authenticate('register'));
createRoomBtn.addEventListener('click', async () => {
  const room = newRoomInput.value.trim();
  if (!room) return;
  await request('/api/rooms', { method: 'POST', body: JSON.stringify({ room }) });
  newRoomInput.value = '';
  loadRooms();
});
sendBtn.addEventListener('click', () => {
  const text = messageInput.value.trim();
  if (!text) return;

  if (currentRoom.startsWith('private:')) {
    const target = currentRoom.split(':')[1];
    websocket.send(JSON.stringify({ type: 'private_message', target, text }));
    addMessage({ username: `You → ${target}`, text, timestamp: new Date().toISOString() });
  } else {
    websocket.send(JSON.stringify({ type: 'message', text }));
  }
  messageInput.value = '';
});

messageInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    sendBtn.click();
  }
});
