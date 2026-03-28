const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3333;
const MSG_FILE = path.join(__dirname, '.chat-messages.json');

// Initialize messages file
if (!fs.existsSync(MSG_FILE)) {
  fs.writeFileSync(MSG_FILE, JSON.stringify({ messages: [], pending: null }));
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve the HTML
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(path.join(__dirname, 'chat.html')));
    return;
  }

  // Get messages
  if (req.url === '/messages' && req.method === 'GET') {
    const data = JSON.parse(fs.readFileSync(MSG_FILE));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  // Post new message from user
  if (req.url === '/send' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { message } = JSON.parse(body);
      const data = JSON.parse(fs.readFileSync(MSG_FILE));
      data.messages.push({ role: 'user', content: message, time: new Date().toISOString() });
      data.pending = message; // Flag for CLI to see
      fs.writeFileSync(MSG_FILE, JSON.stringify(data, null, 2));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // Post response from CLI
  if (req.url === '/respond' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { message } = JSON.parse(body);
      const data = JSON.parse(fs.readFileSync(MSG_FILE));
      data.messages.push({ role: 'assistant', content: message, time: new Date().toISOString() });
      data.pending = null;
      fs.writeFileSync(MSG_FILE, JSON.stringify(data, null, 2));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // Clear chat
  if (req.url === '/clear' && req.method === 'POST') {
    fs.writeFileSync(MSG_FILE, JSON.stringify({ messages: [], pending: null }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n🔥 HOTMESS Chat Bridge running at http://localhost:${PORT}\n`);
  console.log('Open this URL in your browser to chat!\n');
});
