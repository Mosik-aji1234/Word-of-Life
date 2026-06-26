require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs/promises');
const http = require('http');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const SERMONS_FILE = path.join(DATA_DIR, 'sermons.json');
const COUNSELING_REQUESTS_FILE = path.join(DATA_DIR, 'counseling-requests.json');

const CURATED_VERSES = [
  // Faith
  { text: 'Now faith is the substance of things hoped for, the evidence of things not seen.', ref: 'Hebrews 11:1' },
  { text: 'For we walk by faith, not by sight.', ref: '2 Corinthians 5:7' },
  { text: 'If you have faith as small as a mustard seed, you can say to this mountain, "Move from here to there," and it will move. Nothing will be impossible for you.', ref: 'Matthew 17:20' },
  { text: 'So then faith comes by hearing, and hearing by the word of God.', ref: 'Romans 10:17' },
  { text: 'Whatever you ask in prayer, believe that you have received it, and it will be yours.', ref: 'Mark 11:24' },
  // Salvation & Grace
  { text: 'For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life.', ref: 'John 3:16' },
  { text: 'For it is by grace you have been saved, through faith — and this is not from yourselves, it is the gift of God.', ref: 'Ephesians 2:8' },
  { text: 'There is therefore now no condemnation to those who are in Christ Jesus.', ref: 'Romans 8:1' },
  { text: 'If anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come.', ref: '2 Corinthians 5:17' },
  { text: 'For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord.', ref: 'Romans 6:23' },
  { text: 'But God demonstrates His own love for us in this: While we were still sinners, Christ died for us.', ref: 'Romans 5:8' },
  // Strength
  { text: 'I can do all things through Christ who strengthens me.', ref: 'Philippians 4:13' },
  { text: 'The Spirit God gave us does not make us timid, but gives us power, love, and self-discipline.', ref: '2 Timothy 1:7' },
  { text: 'Be strong in the Lord and in the power of His might.', ref: 'Ephesians 6:10' },
  { text: 'My grace is sufficient for you, for My power is made perfect in weakness.', ref: '2 Corinthians 12:9' },
  { text: 'I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus.', ref: 'Philippians 3:14' },
  { text: 'Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.', ref: 'Joshua 1:9' },
  // Love
  { text: 'A new command I give you: Love one another. As I have loved you, so you must love one another.', ref: 'John 13:34' },
  { text: 'And now these three remain: faith, hope, and love. But the greatest of these is love.', ref: '1 Corinthians 13:13' },
  { text: 'We love because He first loved us.', ref: '1 John 4:19' },
  { text: 'Neither death nor life, nor anything else in all creation, will be able to separate us from the love of God that is in Christ Jesus our Lord.', ref: 'Romans 8:38–39' },
  { text: 'Let all that you do be done with love.', ref: '1 Corinthians 16:14' },
  { text: 'Greater love has no one than this: to lay down one\'s life for one\'s friends.', ref: 'John 15:13' },
  // Peace
  { text: 'The peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.', ref: 'Philippians 4:7' },
  { text: 'Peace I leave with you; My peace I give you. Do not let your hearts be troubled and do not be afraid.', ref: 'John 14:27' },
  { text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.', ref: 'Philippians 4:6' },
  { text: 'Come to Me, all you who are weary and burdened, and I will give you rest.', ref: 'Matthew 11:28' },
  { text: 'Let the peace of Christ rule in your hearts.', ref: 'Colossians 3:15' },
  { text: 'Cast all your anxiety on Him because He cares for you.', ref: '1 Peter 5:7' },
  // Prayer
  { text: 'Ask and it will be given to you; seek and you will find; knock and the door will be opened to you.', ref: 'Matthew 7:7' },
  { text: 'Pray without ceasing.', ref: '1 Thessalonians 5:17' },
  { text: 'The prayer of a righteous person is powerful and effective.', ref: 'James 5:16' },
  { text: 'The Spirit helps us in our weakness. We do not know what we ought to pray for, but the Spirit Himself intercedes for us.', ref: 'Romans 8:26' },
  { text: 'My God will meet all your needs according to the riches of His glory in Christ Jesus.', ref: 'Philippians 4:19' },
  // Hope
  { text: 'May the God of hope fill you with all joy and peace as you trust in Him.', ref: 'Romans 15:13' },
  { text: 'We have this hope as an anchor for the soul, firm and secure.', ref: 'Hebrews 6:19' },
  { text: 'In all things God works for the good of those who love Him, who have been called according to His purpose.', ref: 'Romans 8:28' },
  { text: 'Being confident of this, that He who began a good work in you will carry it on to completion.', ref: 'Philippians 1:6' },
  { text: 'Consider it pure joy when you face trials of many kinds, because the testing of your faith produces perseverance.', ref: 'James 1:2–3' },
  { text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.', ref: 'Jeremiah 29:11' },
  // Transformation
  { text: 'Do not conform to the pattern of this world, but be transformed by the renewing of your mind.', ref: 'Romans 12:2' },
  { text: 'I have been crucified with Christ and I no longer live, but Christ lives in me.', ref: 'Galatians 2:20' },
  { text: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles.', ref: 'Isaiah 40:31' },
  // Victory
  { text: 'Thanks be to God! He gives us the victory through our Lord Jesus Christ.', ref: '1 Corinthians 15:57' },
  { text: 'The One who is in you is greater than the one who is in the world.', ref: '1 John 4:4' },
  { text: 'In all these things we are more than conquerors through Him who loved us.', ref: 'Romans 8:37' },
  { text: 'Submit yourselves to God. Resist the devil, and he will flee from you.', ref: 'James 4:7' },
  { text: 'In this world you will have trouble. But take heart! I have overcome the world.', ref: 'John 16:33' },
  { text: 'If God is for us, who can be against us?', ref: 'Romans 8:31' },
  // God's Word
  { text: 'For the word of God is alive and active. Sharper than any double-edged sword.', ref: 'Hebrews 4:12' },
  { text: 'All Scripture is God-breathed and is useful for teaching, rebuking, correcting, and training in righteousness.', ref: '2 Timothy 3:16' },
  { text: 'Heaven and earth will pass away, but My words will never pass away.', ref: 'Matthew 24:35' },
  { text: 'Your word is a lamp to my feet and a light to my path.', ref: 'Psalm 119:105' },
  // Purpose & Calling
  { text: 'For we are God\'s handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do.', ref: 'Ephesians 2:10' },
  { text: 'Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.', ref: 'Matthew 5:16' },
  { text: 'But seek first the kingdom of God and His righteousness, and all these things shall be added to you.', ref: 'Matthew 6:33' },
  { text: 'You did not choose Me, but I chose you and appointed you so that you might go and bear fruit — fruit that will last.', ref: 'John 15:16' },
  { text: 'Go into all the world and preach the gospel to all creation.', ref: 'Mark 16:15' },
  // Abundant Life
  { text: 'I came that they may have life and have it abundantly.', ref: 'John 10:10' },
  { text: 'I am the vine; you are the branches. Whoever abides in Me and I in him, he it is that bears much fruit, for apart from Me you can do nothing.', ref: 'John 15:5' },
  { text: 'For nothing will be impossible with God.', ref: 'Luke 1:37' },
  { text: 'Delight yourself in the Lord, and He will give you the desires of your heart.', ref: 'Psalm 37:4' },
  { text: 'The Lord is my shepherd; I shall not want.', ref: 'Psalm 23:1' },
  { text: 'Trust in the Lord with all your heart and lean not on your own understanding.', ref: 'Proverbs 3:5' },
  { text: 'This is the day the Lord has made; let us rejoice and be glad in it.', ref: 'Psalm 118:24' },
  { text: 'Cast your burden on the Lord, and He shall sustain you.', ref: 'Psalm 55:22' },
  { text: 'The Lord your God is living among you. He is a mighty savior. He will take delight in you with gladness. He will rejoice over you with joyful songs.', ref: 'Zephaniah 3:17' }
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

function getRandomCuratedVerse() {
  const v = CURATED_VERSES[Math.floor(Math.random() * CURATED_VERSES.length)];
  return { text: v.text, ref: v.ref, source: 'curated' };
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

async function sendCounselingEmail(req) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('Email not configured: RESEND_API_KEY is missing');
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Word of Life <onboarding@resend.dev>',
        to: ['mosik.aji15@gmail.com'],
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
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || JSON.stringify(data));
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
    sendJson(response, 200, getRandomCuratedVerse());
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
