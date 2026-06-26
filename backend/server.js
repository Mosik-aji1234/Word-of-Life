require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs/promises');
const http = require('http');
const path = require('path');
const nodemailer = require('nodemailer');

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const SERMONS_FILE = path.join(DATA_DIR, 'sermons.json');
const COUNSELING_REQUESTS_FILE = path.join(DATA_DIR, 'counseling-requests.json');

const RANDOM_VERSE_URL = 'https://labs.bible.org/api/?passage=random&type=json';

const fallbackVerses = [
  { text: 'The Lord is my shepherd; I shall not want.', ref: 'Psalm 23:1', source: 'fallback' },
  { text: 'I can do all things through Christ who strengthens me.', ref: 'Philippians 4:13', source: 'fallback' },
  { text: 'Trust in the Lord with all your heart and lean not on your own understanding.', ref: 'Proverbs 3:5', source: 'fallback' },
  { text: 'Be strong and courageous. Do not be afraid.', ref: 'Joshua 1:9', source: 'fallback' },
  { text: 'Your word is a lamp to my feet and a light to my path.', ref: 'Psalm 119:105', source: 'fallback' },
  { text: 'For God so loved the world that He gave His only begotten Son.', ref: 'John 3:16', source: 'fallback' },
  { text: 'Cast your burden on the Lord, and He shall sustain you.', ref: 'Psalm 55:22', source: 'fallback' },
  { text: 'Let all that you do be done with love.', ref: '1 Corinthians 16:14', source: 'fallback' }
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

function getRandomFallbackVerse() {
  return fallbackVerses[Math.floor(Math.random() * fallbackVerses.length)];
}

function stripHtml(text) {
  return text.replace(/<[^>]*>/g, '');
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#8212;/g, '—')
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&mdash;/g, '—')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”');
}

function normalizeLabsVerse(data) {
  const verse = Array.isArray(data) ? data[0] : data;
  return {
    text: decodeHtmlEntities(stripHtml(verse.text)).trim(),
    ref: `${verse.bookname} ${verse.chapter}:${verse.verse}`,
    source: 'live'
  };
}

async function fetchRandomVerse() {
  const response = await fetch(RANDOM_VERSE_URL, {
    headers: { 'Accept': 'application/json' }
  });
  if (!response.ok) throw new Error(`Verse API returned ${response.status}`);
  return normalizeLabsVerse(await response.json());
}

function formatDuration(ms) {
  if (!ms) return '';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

async function searchPodcastSermons(query) {
  const params = new URLSearchParams({
    term: `${query} sermon`,
    media: 'podcast',
    entity: 'podcastEpisode',
    limit: '15',
    lang: 'en_us'
  });

  const response = await fetch(
    `https://itunes.apple.com/search?${params}`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) throw new Error(`Podcast search returned ${response.status}`);

  const data = await response.json();

  return (data.results || [])
    .filter(ep => ep.episodeUrl)
    .map(ep => ({
      id: String(ep.trackId),
      title: decodeHtmlEntities(ep.trackName || 'Untitled'),
      preacher: ep.artistName || ep.collectionName || '',
      description: decodeHtmlEntities(
        (ep.shortDescription || ep.description || '').slice(0, 140)
      ),
      category: ep.collectionName || 'Sermon Podcast',
      duration: formatDuration(ep.trackTimeMillis),
      sourceType: 'audio',
      audioUrl: ep.episodeUrl,
      downloadUrl: ep.episodeUrl,
      thumbnail: ep.artworkUrl600 || ep.artworkUrl160 || '',
      externalUrl: ep.trackViewUrl || '',
      available: true
    }));
}

function getEmailTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn('Email not configured: GMAIL_USER or GMAIL_APP_PASSWORD is missing');
    return null;
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass }
  });
}

async function sendCounselingEmail(req) {
  const transporter = getEmailTransporter();
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: `"Word of Life" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `New Counseling Request from ${req.name}`,
      html: `
        <h2 style="color:#7b1f2a;">New Counseling Request</h2>
        <p><strong>Name:</strong> ${req.name}</p>
        <p><strong>Email:</strong> <a href="mailto:${req.email}">${req.email}</a></p>
        <p><strong>Phone:</strong> ${req.phone}</p>
        <p><strong>Message:</strong></p>
        <blockquote style="border-left:4px solid #c9972b;padding:0.5rem 1rem;color:#444;">
          ${req.message.replace(/\n/g, '<br>')}
        </blockquote>
        <hr>
        <p style="color:#888;font-size:0.9rem;">Submitted: ${new Date().toLocaleString()}</p>
      `
    });
    console.log(`Counseling email sent for ${req.name} (${req.email})`);
  } catch (err) {
    console.error('Failed to send counseling email:', err.message);
  }
}

async function readJsonFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
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

  if (url.pathname === '/api/daily-verse' && request.method === 'GET') {
    try {
      const verse = await fetchRandomVerse();
      sendJson(response, 200, verse);
    } catch {
      sendJson(response, 200, getRandomFallbackVerse());
    }
    return;
  }

  if (url.pathname === '/api/sermons/search' && request.method === 'GET') {
    const query = url.searchParams.get('q') || '';
    if (!query.trim()) {
      sendJson(response, 400, { error: 'Search query is required' });
      return;
    }
    try {
      const results = await searchPodcastSermons(query.trim());
      sendJson(response, 200, results);
    } catch (error) {
      sendJson(response, 502, { error: error.message });
    }
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
    sendCounselingEmail(newRequest); // non-blocking — errors are logged inside the function
    sendJson(response, 201, {
      ok: true,
      message: 'Your counseling request has been received.',
      request: newRequest
    });
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
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    const proto = request.headers['x-forwarded-proto'] || 'http';
    const base = `${proto}://${request.headers.host}`;

    if (url.pathname === '/robots.txt') {
      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${base}/sitemap.xml\n`);
      return;
    }

    if (url.pathname === '/sitemap.xml') {
      const pages = [
        { loc: '/', priority: '1.0' },
        { loc: '/books.html', priority: '0.8' },
        { loc: '/sermons.html', priority: '0.8' },
        { loc: '/bible.html', priority: '0.7' },
        { loc: '/counseling.html', priority: '0.7' },
        { loc: '/tracts.html', priority: '0.7' }
      ];
      const urls = pages
        .map(p => `  <url><loc>${base}${p.loc}</loc><changefreq>weekly</changefreq><priority>${p.priority}</priority></url>`)
        .join('\n');
      response.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
      response.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
      return;
    }

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
  console.log(`Sermon search: iTunes Podcast API (no key required)`);
});
