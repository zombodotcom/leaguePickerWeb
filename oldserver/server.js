import { createServer } from 'node:http';
import { request as httpsRequest, Agent as HttpsAgent } from 'node:https';
import { readFileSync, existsSync, createReadStream } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const PUBLIC_DIR = join(__dirname, 'public');
const DEFAULT_LOCKFILE_PATHS = [
  // Common default Windows install path
  'C:/Riot Games/League of Legends/lockfile',
  // Alternate path if installed in Program Files
  'C:/Program Files/Riot Games/League of Legends/lockfile',
  'C:/Program Files (x86)/Riot Games/League of Legends/lockfile'
];

function findLockfilePath() {
  for (const candidate of DEFAULT_LOCKFILE_PATHS) {
    try {
      if (existsSync(candidate)) {
        return candidate;
      }
    } catch (_err) {
      // ignore and keep looking
    }
  }
  return null;
}

function readLockfile(lockfilePath) {
  const raw = readFileSync(lockfilePath, 'utf8');
  // Format: name pid port password protocol
  const [name, pidStr, portStr, password, protocol] = raw.trim().split(':');
  const port = Number(portStr);
  const pid = Number(pidStr);
  if (!name || Number.isNaN(pid) || Number.isNaN(port) || !password || !protocol) {
    throw new Error('Invalid lockfile contents');
  }
  return { name, pid, port, password, protocol };
}

function buildBasicAuthHeader(username, password) {
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${token}`;
}

function lcuRequest({ method = 'GET', path = '/', port, password, isBinary = false }) {
  const options = {
    host: '127.0.0.1',
    port,
    path,
    method,
    headers: {
      'Accept': isBinary ? '*/*' : 'application/json',
      'Content-Type': 'application/json',
      'Authorization': buildBasicAuthHeader('riot', password)
    },
    agent: new HttpsAgent({ rejectUnauthorized: false })
  };

  return new Promise((resolvePromise, rejectPromise) => {
    const req = httpsRequest(options, (res) => {
      if (isBinary) {
        // Handle binary data
        const chunks = [];
        res.on('data', (chunk) => { chunks.push(chunk); });
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolvePromise({ statusCode: res.statusCode, body: buffer });
        });
      } else {
        // Handle text/JSON data
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (!data) {
            resolvePromise({ statusCode: res.statusCode, body: null });
            return;
          }
          try {
            const json = JSON.parse(data);
            resolvePromise({ statusCode: res.statusCode, body: json });
          } catch (_err) {
            resolvePromise({ statusCode: res.statusCode, body: data });
          }
        });
      }
    });
    req.on('error', rejectPromise);
    req.end();
  });
}

function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function serveStatic(req, res) {
  let urlPath = req.url || '/';
  if (urlPath === '/') urlPath = '/index.html';
  const safePath = urlPath.split('?')[0].replace(/\\/g, '/');
  const filePath = join(PUBLIC_DIR, safePath);

  if (!existsSync(filePath)) {
    sendText(res, 404, 'Not found');
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = ext === '.html' ? 'text/html; charset=utf-8'
    : ext === '.js' ? 'text/javascript; charset=utf-8'
    : ext === '.css' ? 'text/css; charset=utf-8'
    : 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  createReadStream(filePath).pipe(res);
}

async function handleApi(req, res) {
  const lockfilePath = findLockfilePath();
  if (!lockfilePath) {
    sendJson(res, 404, { error: 'Lockfile not found in default directories. Please open the League client.' });
    return;
  }

  let lock;
  try {
    lock = readLockfile(lockfilePath);
  } catch (err) {
    sendJson(res, 500, { error: 'Failed to parse lockfile', details: String(err && err.message || err) });
    return;
  }

  try {
    if (req.url === '/api/summoner') {
      const { statusCode, body } = await lcuRequest({
        path: '/lol-summoner/v1/current-summoner',
        port: lock.port,
        password: lock.password
      });
      sendJson(res, statusCode || 200, body);
      return;
    }

    if (req.url === '/api/challenges') {
      const { statusCode, body } = await lcuRequest({
        path: '/lol-challenges/v1/challenges/local-player',
        port: lock.port,
        password: lock.password
      });
      sendJson(res, statusCode || 200, body);
      return;
    }

    if (req.url === '/api/arena-challenge') {
      const { statusCode, body } = await lcuRequest({
        path: '/lol-challenges/v1/challenges/local-player',
        port: lock.port,
        password: lock.password
      });
      
      if (statusCode === 200 && body) {
        // Check if Arena Champion challenge exists directly in the response
        if (body['602002']) {
          sendJson(res, 200, body['602002']);
        } else {
          // Log available challenge IDs for debugging (first 20 only)
          const challengeIds = Object.keys(body).slice(0, 20);
          console.log('Available challenge IDs (first 20):', challengeIds);
          
          sendJson(res, 404, { 
            error: 'Arena Champion challenge (602002) not found',
            debug: {
              totalChallenges: Object.keys(body).length,
              sampleChallengeIds: challengeIds,
              hasArenaChallenge: !!body['602002']
            }
          });
        }
      } else {
        sendJson(res, statusCode || 404, { error: 'Failed to fetch challenges data' });
      }
      return;
    }

    if (req.url === '/api/champions') {
      // Try multiple endpoints to get champion data
      let championsData = null;
      let lastError = null;
      
      // Try the owned champions endpoint first (this works but limited)
      const { statusCode, body } = await lcuRequest({
        path: '/lol-champions/v1/owned-champions-minimal',
        port: lock.port,
        password: lock.password
      });
      
      if (statusCode === 200 && body) {
        championsData = body;
        console.log('Using owned champions data:', {
          bodyKeys: Object.keys(body),
          sampleChampion: body[Object.keys(body)[0]] || 'no champions',
          totalChampions: Object.keys(body).length
        });
        

      } else {
        lastError = `Status: ${statusCode}, Body: ${JSON.stringify(body)}`;
      }
      
      sendJson(res, statusCode || 200, championsData || { error: 'No champion data available', lastError });
      return;
    }

    if (req.url.startsWith('/api/champion-image/')) {
      const imagePath = req.url.replace('/api/champion-image', '');
      console.log('Requesting champion image:', imagePath);
      
      const { statusCode, body } = await lcuRequest({
        path: imagePath,
        port: lock.port,
        password: lock.password,
        isBinary: true
      });
      
      console.log('Image response status:', statusCode, 'for path:', imagePath);
      console.log('Image body type:', typeof body, 'length:', body ? body.length : 'null');
      
      if (statusCode === 200 && body) {
        // Set proper headers for image serving
        res.writeHead(200, { 
          'Content-Type': 'image/png',
          'Content-Length': body.length,
          'Cache-Control': 'public, max-age=3600'
        });
        res.end(body);
      } else {
        console.log('Image not found:', imagePath, 'Status:', statusCode);
        sendText(res, 404, 'Image not found');
      }
      return;
    }

    sendJson(res, 404, { error: 'Unknown API route' });
  } catch (err) {
    sendJson(res, 500, { error: 'LCU request failed', details: String(err && err.message || err) });
  }
}

const server = createServer((req, res) => {
  if ((req.url || '').startsWith('/api/')) {
    handleApi(req, res);
    return;
  }
  serveStatic(req, res);
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 5173;
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at http://localhost:${PORT}`);
});


