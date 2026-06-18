/**
 * server.js (drop-in replacement)
 * - Keeps existing behavior: static dist hosting (prod), demo API, events/progress logging, optional WS
 * - Adds /api/proxy (GET + POST/PUT/PATCH/DELETE) to allow browser UI to reach sidecars safely
 *
 * Usage from frontend:
 *   POST /api/proxy
 *   {
 *     "url": "http://localhost:3001/users",
 *     "method": "GET",
 *     "headers": {"Authorization":"Bearer ..."},
 *     "body": "{\"x\":1}" // or object, or null
 *   }
 *
 * Or simple GET proxy:
 *   GET /api/proxy?url=http%3A%2F%2Flocalhost%3A3001%2Fusers
 */
const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const url = require('url');
// Try to load WebSocket module, fallback if not available
let WebSocket = null;
let isWebSocketAvailable = false;
try {
WebSocket = require('ws');
isWebSocketAvailable = true;
console.log('WebSocket support enabled');
} catch (error) {
console.log('WebSocket support disabled (ws package not installed)');
console.log('Install with: npm install ws');
}
const DIST_DIR = path.join(__dirname, 'dist');
const DATA_DIR = path.join(__dirname, '.api-sim-data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.jsonl');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');
const isProduction = process.env.IS_PRODUCTION === 'true';
if (isProduction && !fs.existsSync(DIST_DIR)) {
throw new Error(`Production mode enabled but dist directory does not exist: ${DIST_DIR}`);
}
// Force port 3000 in production, otherwise use PORT env or default to 3000
const PORT = isProduction ? 3000 : (process.env.PORT || 3000);
if (!fs.existsSync(DATA_DIR)) {
fs.mkdirSync(DATA_DIR, { recursive: true });
}
// Track connected WebSocket clients
const wsClients = new Set();
// Demo API state
const demoUsers = [];
let nextDemoUserId = 1;
// MIME types
const mimeTypes = {
'.html': 'text/html',
'.js': 'text/javascript',
'.css': 'text/css',
'.json': 'application/json',
'.png': 'image/png',
'.jpg': 'image/jpeg',
'.jpeg': 'image/jpeg',
'.gif': 'image/gif',
'.svg': 'image/svg+xml',
'.ico': 'image/x-icon',
'.woff': 'font/woff',
'.woff2': 'font/woff2',
'.ttf': 'font/ttf',
'.eot': 'application/vnd.ms-fontobject'
};
function getMimeType(filePath) {
const ext = path.extname(filePath).toLowerCase();
return mimeTypes[ext] || 'text/plain';
}
function serveFile(filePath, res) {
fs.readFile(filePath, (err, data) => {
if (err) {
res.writeHead(404, { 'Content-Type': 'text/plain' });
res.end('File not found');
return;
    }
const mimeType = getMimeType(filePath);
res.writeHead(200, { 'Content-Type': mimeType });
res.end(data);
  });
}
function sendJson(res, statusCode, payload) {
res.writeHead(statusCode, { 'Content-Type': 'application/json' });
if (statusCode === 204) {
res.end();
return;
  }
res.end(JSON.stringify(payload));
}
function readRequestBody(req) {
return new Promise((resolve, reject) => {
let body = '';
req.on('data', (chunk) => {
body += chunk.toString();
if (body.length > 5 * 1024 * 1024) {
req.destroy();
reject(new Error('Payload too large'));
      }
    });
req.on('end', () => resolve(body));
req.on('error', reject);
  });
}
/**
 * =========================
 * WebSocket message endpoint
 * =========================
 */
async function handleMessagePost(req, res) {
try {
const body = await readRequestBody(req);
const data = JSON.parse(body);
const message = data.message;
if (!message) {
sendJson(res, 400, { error: 'Message is required' });
return;
    }
if (!isWebSocketAvailable) {
sendJson(res, 503, {
error: 'WebSocket functionality not available',
details: 'Install the ws package with: npm install ws'
      });
return;
    }
wsClients.forEach((client) => {
if (client.readyState === WebSocket.OPEN) {
client.send(JSON.stringify({ type: 'message', message }));
      }
    });
sendJson(res, 200, { success: true, clientCount: wsClients.size });
  } catch (error) {
sendJson(res, 400, { error: 'Invalid JSON' });
  }
}
/**
 * ==========
 * Event logs
 * ==========
 */
function isValidEvent(event) {
const eventType = typeof event.eventType === 'string' ? event.eventType : event.type;
return (
event &&
typeof event === 'object' &&
typeof eventType === 'string' &&
typeof event.timestamp === 'string' &&
typeof event.sessionId === 'string' &&
typeof event.taskId === 'string'
  );
}
async function appendEvent(event) {
await fsp.appendFile(EVENTS_FILE, `${JSON.stringify(event)}\n`, 'utf-8');
}
async function handleEventsPost(req, res) {
try {
const body = await readRequestBody(req);
const event = JSON.parse(body);
if (!isValidEvent(event)) {
sendJson(res, 400, { error: 'Invalid event payload' });
return;
    }
if (typeof event.eventType !== 'string' && typeof event.type === 'string') {
event.eventType = event.type;
delete event.type;
    }
await appendEvent(event);
sendJson(res, 204, {});
  } catch (error) {
sendJson(res, 400, { error: 'Invalid JSON' });
  }
}
async function readEvents(limit) {
try {
const data = await fsp.readFile(EVENTS_FILE, 'utf-8');
const lines = data.split('\n').filter(Boolean);
const slice = lines.slice(-limit);
return slice
      .map((line) => {
try {
return JSON.parse(line);
        } catch (_) {
return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
if (error.code === 'ENOENT') return [];
throw error;
  }
}
async function handleEventsGet(req, res, parsedUrl) {
const limitParam = parsedUrl.query.limit;
const limit = Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 500);
try {
const events = await readEvents(limit);
sendJson(res, 200, events);
  } catch (error) {
console.error('Failed to read events', error);
sendJson(res, 500, { error: 'Failed to read events' });
  }
}
/**
 * =========
 * Progress
 * =========
 */
function isValidProgress(progress) {
return (
progress &&
typeof progress === 'object' &&
typeof progress.taskId === 'string' &&
typeof progress.sessionId === 'string' &&
Array.isArray(progress.completedStepIds) &&
    (progress.lastSelectedStepId === null || typeof progress.lastSelectedStepId === 'string') &&
typeof progress.updatedAt === 'string'
  );
}
async function writeProgress(progress) {
const tempFile = `${PROGRESS_FILE}.tmp`;
await fsp.writeFile(tempFile, JSON.stringify(progress, null, 2), 'utf-8');
await fsp.rename(tempFile, PROGRESS_FILE);
}
async function handleProgressPost(req, res) {
try {
const body = await readRequestBody(req);
const progress = JSON.parse(body);
if (!isValidProgress(progress)) {
sendJson(res, 400, { error: 'Invalid progress payload' });
return;
    }
await writeProgress(progress);
sendJson(res, 204, {});
  } catch (error) {
sendJson(res, 400, { error: 'Invalid JSON' });
  }
}
async function handleProgressGet(res) {
try {
const data = await fsp.readFile(PROGRESS_FILE, 'utf-8');
sendJson(res, 200, JSON.parse(data));
  } catch (error) {
if (error.code === 'ENOENT') {
sendJson(res, 404, { error: 'Progress not found' });
return;
    }
console.error('Failed to read progress file', error);
sendJson(res, 500, { error: 'Failed to read progress' });
  }
}
async function handleReset(res) {
try {
await Promise.all([
fsp.rm(EVENTS_FILE, { force: true }),
fsp.rm(PROGRESS_FILE, { force: true })
    ]);
sendJson(res, 204, {});
  } catch (error) {
sendJson(res, 500, { error: 'Failed to reset data' });
  }
}
/**
 * ===========================
 * Sidecar proxy (/api/proxy)
 * ===========================
 *
 * Why this exists:
 * - Browser in CodeSignal preview cannot reach container localhost/sidecars directly.
 * - This endpoint runs inside the container, so it CAN reach sidecars (localhost:3001 or service-name:3001).
 *
 * Security:
 * - This version is allowlisted to local hosts + port 3001 by default.
 * - You can expand allowed hosts/ports safely later.
 */
const DEFAULT_ALLOWED_HOSTS = new Set([
'localhost',
'127.0.0.1',
// include common docker name "reading-tracker" (optional)
'reading-tracker'
]);
const DEFAULT_ALLOWED_PORTS = new Set([
'3001'
]);
function normalizeHeaders(input) {
const out = {};
if (!input || typeof input !== 'object') return out;
for (const [k, v] of Object.entries(input)) {
if (typeof k !== 'string') continue;
// ignore undefined/null
if (v === undefined || v === null) continue;
out[k] = String(v);
  }
return out;
}
function shouldAllowTarget(targetUrl) {
try {
const u = new URL(targetUrl);
const hostOk = DEFAULT_ALLOWED_HOSTS.has(u.hostname);
const port = u.port || (u.protocol === 'https:' ? '443' : '80');
const portOk = DEFAULT_ALLOWED_PORTS.has(port);
// only http(s)
const protoOk = u.protocol === 'http:' || u.protocol === 'https:';
return protoOk && hostOk && portOk;
  } catch (_) {
return false;
  }
}
async function handleProxy(req, res, parsedUrl) {
try {
let targetUrl = '';
let method = req.method || 'GET';
let headers = {};
let body = null;
if (req.method === 'GET') {
// GET /api/proxy?url=...
const q = parsedUrl.query.url;
if (typeof q !== 'string' || !q) {
sendJson(res, 400, { error: 'Missing url query param' });
return;
      }
targetUrl = q;
    } else {
// POST/PUT/PATCH/DELETE /api/proxy
const bodyText = await readRequestBody(req);
const payload = JSON.parse(bodyText || '{}');
targetUrl = payload.url;
method = (payload.method || req.method || 'GET').toUpperCase();
headers = normalizeHeaders(payload.headers);
body = payload.body ?? null;
    }
if (typeof targetUrl !== 'string' || !targetUrl) {
sendJson(res, 400, { error: 'url is required' });
return;
    }
if (!shouldAllowTarget(targetUrl)) {
sendJson(res, 403, {
error: 'Target not allowed',
details: 'Only local sidecar hosts on port 3001 are allowed by default.',
target: targetUrl
      });
return;
    }
// Ensure method is one of supported ones
const allowedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
if (!allowedMethods.has(method)) {
sendJson(res, 400, { error: `Unsupported method: ${method}` });
return;
    }
// Prepare body
let outgoingBody = undefined;
if (method !== 'GET' && method !== 'DELETE' && body != null) {
if (typeof body === 'string') {
outgoingBody = body;
      } else {
// If body is object/array, send JSON
outgoingBody = JSON.stringify(body);
if (!headers['Content-Type'] && !headers['content-type']) {
headers['Content-Type'] = 'application/json';
        }
      }
    }
// Timeout to avoid hanging
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 12000);
const resp = await fetch(targetUrl, {
method,
headers,
body: outgoingBody,
signal: controller.signal
    }).finally(() => clearTimeout(timeout));
const respContentType = resp.headers.get('content-type') || 'text/plain';
const respText = await resp.text();
// Forward response as-is
res.writeHead(resp.status, {
'Content-Type': respContentType,
// helpful for debugging
'X-Proxy-Target': targetUrl
    });
res.end(respText);
  } catch (e) {
sendJson(res, 500, { error: 'Proxy failed', details: String(e && e.message ? e.message : e) });
  }
}
/**
 * ============
 * API routing
 * ============
 */
function routeApiRequest(req, res, parsedUrl) {
// proxy supports GET and POST/PUT/PATCH/DELETE (all via /api/proxy)
if (parsedUrl.pathname === '/api/proxy') {
void handleProxy(req, res, parsedUrl);
return true;
  }
if (req.method === 'GET') {
if (parsedUrl.pathname === '/api/events') {
void handleEventsGet(req, res, parsedUrl);
return true;
    }
if (parsedUrl.pathname === '/api/progress') {
void handleProgressGet(res);
return true;
    }
  } else if (req.method === 'POST') {
if (parsedUrl.pathname === '/api/events') {
void handleEventsPost(req, res);
return true;
    }
if (parsedUrl.pathname === '/api/progress') {
void handleProgressPost(req, res);
return true;
    }
if (!isProduction && parsedUrl.pathname === '/api/reset') {
void handleReset(res);
return true;
    }
  }
return false;
}
/**
 * ==========
 * Demo API
 * ==========
 */
async function routeDemoRequest(req, res, parsedUrl) {
const pathname = parsedUrl.pathname;
const isDemoApi = pathname.startsWith('/demo-api');
const isDemo = pathname.startsWith('/demo');
if (!isDemoApi && !isDemo) {
return false;
  }
const basePath = isDemoApi ? '/demo-api' : '/demo';
const relativePath = pathname.startsWith(basePath) ? pathname.slice(basePath.length) || '/' : '/';
if (req.method === 'GET' && relativePath === '/health') {
sendJson(res, 200, { ok: true, time: new Date().toISOString() });
return true;
  }
if (req.method === 'GET' && relativePath === '/users') {
sendJson(res, 200, demoUsers);
return true;
  }
const userMatch = relativePath.match(/^\/users\/(\d+)$/);
if (req.method === 'GET' && userMatch) {
const userId = Number(userMatch[1]);
const user = demoUsers.find((item) => item.id === userId);
if (!user) {
sendJson(res, 404, { error: 'User not found' });
return true;
    }
sendJson(res, 200, user);
return true;
  }
if (req.method === 'POST' && relativePath === '/users') {
try {
const body = await readRequestBody(req);
const data = JSON.parse(body);
if (typeof data.name !== 'string' || data.name.trim().length === 0) {
sendJson(res, 400, { error: 'Name is required' });
return true;
      }
const user = { id: nextDemoUserId++, name: data.name.trim() };
demoUsers.push(user);
sendJson(res, 201, user);
return true;
    } catch (error) {
sendJson(res, 400, { error: 'Invalid JSON' });
return true;
    }
  }
if ((req.method === 'PUT' || req.method === 'PATCH') && userMatch) {
try {
const userId = Number(userMatch[1]);
const body = await readRequestBody(req);
const data = JSON.parse(body);
if (typeof data.name !== 'string' || data.name.trim().length === 0) {
sendJson(res, 400, { error: 'Name is required' });
return true;
      }
const index = demoUsers.findIndex((item) => item.id === userId);
if (index < 0) {
sendJson(res, 404, { error: 'User not found' });
return true;
      }
demoUsers[index] = { ...demoUsers[index], name: data.name.trim() };
sendJson(res, 200, demoUsers[index]);
return true;
    } catch (error) {
sendJson(res, 400, { error: 'Invalid JSON' });
return true;
    }
  }
if (req.method === 'DELETE' && userMatch) {
const userId = Number(userMatch[1]);
const index = demoUsers.findIndex((item) => item.id === userId);
if (index < 0) {
sendJson(res, 404, { error: 'User not found' });
return true;
    }
demoUsers.splice(index, 1);
sendJson(res, 200, { deleted: true });
return true;
  }
sendJson(res, 404, { error: 'Demo endpoint not found' });
return true;
}
function handlePostRequest(req, res, parsedUrl) {
if (parsedUrl.pathname === '/message') {
void handleMessagePost(req, res);
  } else if (parsedUrl.pathname.startsWith('/api/')) {
if (!routeApiRequest(req, res, parsedUrl)) {
res.writeHead(404, { 'Content-Type': 'application/json' });
res.end(JSON.stringify({ error: 'Not found' }));
    }
  } else {
res.writeHead(404, { 'Content-Type': 'text/plain' });
res.end('Not found');
  }
}
/**
 * ============
 * HTTP server
 * ============
 */
const server = http.createServer((req, res) => {
const parsedUrl = url.parse(req.url, true);
const pathName = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
// Basic CORS (for your own /api/* endpoints)
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
if (req.method === 'OPTIONS') {
res.writeHead(204);
res.end();
return;
  }
// /api/*
if (parsedUrl.pathname.startsWith('/api/')) {
if (!routeApiRequest(req, res, parsedUrl)) {
sendJson(res, 404, { error: 'Not found' });
    }
return;
  }
// /demo-api/* or /demo/*
if (parsedUrl.pathname.startsWith('/demo-api') || parsedUrl.pathname.startsWith('/demo')) {
void routeDemoRequest(req, res, parsedUrl);
return;
  }
// POST /message and legacy handler
if (req.method === 'POST') {
handlePostRequest(req, res, parsedUrl);
return;
  }
// Production: serve static dist
if (isProduction) {
// Strip leading slashes so path.join/resolve can't ignore DIST_DIR
const filePath = path.join(DIST_DIR, pathName.replace(/^\/+/, ''));
// Security check - prevent directory traversal
const resolvedDistDir = path.resolve(DIST_DIR);
const resolvedFilePath = path.resolve(filePath);
const relativePath = path.relative(resolvedDistDir, resolvedFilePath);
if (relativePath.startsWith('..')) {
res.writeHead(403, { 'Content-Type': 'text/plain' });
res.end('Forbidden');
return;
    }
serveFile(filePath, res);
  } else {
res.writeHead(404, { 'Content-Type': 'text/plain' });
res.end('Not found (development mode - use Vite dev server `npm run start:dev`)');
  }
});
/**
 * =============
 * WebSocket /ws
 * =============
 */
if (isWebSocketAvailable) {
const wss = new WebSocket.Server({
server,
path: '/ws'
  });
wss.on('connection', (ws) => {
console.log('New WebSocket client connected');
wsClients.add(ws);
ws.on('close', () => {
console.log('WebSocket client disconnected');
wsClients.delete(ws);
    });
ws.on('error', (error) => {
console.error('WebSocket error:', error);
wsClients.delete(ws);
    });
  });
}
/**
 * ==========
 * Startup
 * ==========
 */
server.listen(PORT, () => {
console.log(`Server running at http://localhost:${PORT}`);
if (isProduction) {
console.log(`Serving static files from: ${DIST_DIR}`);
  } else {
console.log(`Development mode - static files served by Vite`);
  }
if (isWebSocketAvailable) {
console.log(`WebSocket server running on /ws`);
  } else {
console.log(`WebSocket functionality disabled - install 'ws' package to enable`);
  }
console.log('Press Ctrl+C to stop the server');
});
// Handle server errors
server.on('error', (err) => {
if (err.code === 'EADDRINUSE') {
console.error(`Port ${PORT} is already in use. Please try a different port.`);
  } else {
console.error('Server error:', err);
  }
process.exit(1);
});
// Graceful shutdown
process.on('SIGINT', () => {
console.log('\nShutting down server...');
server.close(() => {
console.log('Server closed');
process.exit(0);
  });
});
