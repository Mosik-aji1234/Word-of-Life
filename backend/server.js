const fs = require('fs/promises');
const http = require('http');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const SERMONS_FILE = path.join(DATA_DIR, 'sermons.json');
const COUNSELING_REQUESTS_FILE = path.join(DATA_DIR, 'counseling-requests.json');
const DAILY_VERSE_URL = 'https://beta.ourmanna.com/api/v1/get/?format=json&order=daily';

const fallbackVerses = [
  { text: 'The Lord is my shepherd; I shall not want.', ref: 'Psalm 23:1', source: 'fallback' },
  { text: 'I can do all things through Christ who strengthens me.', ref: 'Philippians 4:13', source: 'fallback' },
  { text: 'Trust in the Lord with all your heart and lean not on your own understanding.', ref: 'Proverbs 3:5', source: 'fallback' },
  { text: 'Be strong and courageous. Do not be afraid.', ref: 'Joshua 1:9', source: 'fallback' },
  { text: 'Your word is a lamp to my feet and a light to my path.', ref: 'Psalm 119:105', source: 'fallback' }
];

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
  '.png': 'image/png'
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  response.end(JSON.stringify(payload));
}

function getFallbackVerse() {
  const today = new Date();
  const seed = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  return fallbackVerses[seed % fallbackVerses.length];
}

async function readJsonFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : {};
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateCounselingRequest(payload) {
  const request = {
    name: cleanText(payload.name),
    phone: cleanText(payload.phone),
    email: cleanText(payload.email),
    message: cleanText(payload.message)
  };

  const missingFields = Object.entries(request)
    .filter(([, value]) => !value)
    .map(([field]) => field);

  if (missingFields.length) {
    return {
      error: `Missing required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(', ')}`
    };
  }

  if (!request.email.includes('@')) {
    return { error: 'Please provide a valid email address.' };
  }

  return { request };
}

function normalizeDailyVerse(payload) {
  const details = payload?.verse?.details || payload?.details || payload;
  return {
    text: details.text || details.content || '',
    ref: details.reference || details.ref || '',
    source: 'OurManna'
  };
}

async function handleApi(request, response, url) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    response.end();
    return;
  }

  if (url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, service: 'word-of-life-api' });
    return;
  }

  if (url.pathname === '/api/sermons' && request.method === 'GET') {
    sendJson(response, 200, await readJsonFile(SERMONS_FILE));
    return;
  }

  if (url.pathname === '/api/sermons' && request.method === 'POST') {
    const sermons = await readJsonFile(SERMONS_FILE);
    const sermon = await readRequestBody(request);
    const nextId = sermons.reduce((highest, item) => Math.max(highest, item.id || 0), 0) + 1;
    const newSermon = { id: nextId, available: true, ...sermon };

    sermons.push(newSermon);
    await fs.writeFile(SERMONS_FILE, `${JSON.stringify(sermons, null, 2)}\n`);
    sendJson(response, 201, newSermon);
    return;
  }

  if (url.pathname === '/api/counseling' && request.method === 'POST') {
    const payload = await readRequestBody(request);
    const { request: counselingRequest, error } = validateCounselingRequest(payload);

    if (error) {
      sendJson(response, 400, { error });
      return;
    }

    const counselingRequests = await readJsonFile(COUNSELING_REQUESTS_FILE);
    const nextId = counselingRequests.reduce((highest, item) => Math.max(highest, item.id || 0), 0) + 1;
    const newRequest = {
      id: nextId,
      ...counselingRequest,
      status: 'new',
      submittedAt: new Date().toISOString()
    };

    counselingRequests.push(newRequest);
    await fs.writeFile(COUNSELING_REQUESTS_FILE, `${JSON.stringify(counselingRequests, null, 2)}\n`);
    sendJson(response, 201, {
      ok: true,
      message: 'Your counseling request has been received.',
      request: newRequest
    });
    return;
  }

  if (url.pathname === '/api/daily-verse' && request.method === 'GET') {
    try {
      const apiResponse = await fetch(DAILY_VERSE_URL);
      if (!apiResponse.ok) throw new Error(`Daily verse API returned ${apiResponse.status}`);

      const verse = normalizeDailyVerse(await apiResponse.json());
      if (!verse.text || !verse.ref) throw new Error('Daily verse API returned an unexpected response');

      sendJson(response, 200, verse);
    } catch (error) {
      sendJson(response, 200, {
        ...getFallbackVerse(),
        note: 'Live daily verse is unavailable, so the local fallback was used.'
      });
    }
    return;
  }

  sendJson(response, 404, { error: 'API route not found' });
}

async function serveStaticFile(request, response, url) {
  const requestedPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = path.normalize(path.join(ROOT_DIR, requestedPath));

  if (!filePath.startsWith(ROOT_DIR)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
    });
    response.end(file);
  } catch (error) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url);
      return;
    }

    await serveStaticFile(request, response, url);
  } catch (error) {
    sendJson(response, 500, { error: 'Server error', message: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Word of Life server running at http://localhost:${PORT}`);
});
