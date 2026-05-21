/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const {
  DATALENS_EMBED_ID,
  DATALENS_PRIVATE_KEY_PATH,
  DATALENS_EMBED_BASE_URL = 'https://datalens.ru',
} = process.env;

const privateKey = fs.readFileSync(
  path.isAbsolute(DATALENS_PRIVATE_KEY_PATH)
    ? DATALENS_PRIVATE_KEY_PATH
    : path.resolve(__dirname, '..', DATALENS_PRIVATE_KEY_PATH),
  'utf8',
);

const now = Math.floor(Date.now() / 1000);
const token = jwt.sign(
  {
    embedId: DATALENS_EMBED_ID,
    dlEmbedService: 'YC_DATALENS_EMBEDDING_SERVICE_MARK',
    iat: now,
    exp: now + 600,
    params: {},
  },
  privateKey,
  { algorithm: 'PS256' },
);

console.log('embedId:', DATALENS_EMBED_ID);
console.log('token len:', token.length);
console.log('embed url base:', DATALENS_EMBED_BASE_URL);

const base = DATALENS_EMBED_BASE_URL.replace(/\/$/, '');

async function tryRequest(method, url, body, headers = {}) {
  try {
    const isGet = method === 'GET';
    const r = await axios.request({
      method,
      url,
      data: body,
      headers: {
        Accept: isGet ? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' : 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        ...(isGet ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      timeout: 10000,
      validateStatus: () => true,
      maxRedirects: 0,
    });
    const ct = r.headers['content-type'] || '';
    let preview;
    if (typeof r.data === 'object') preview = JSON.stringify(r.data).slice(0, 200);
    else preview = String(r.data).slice(0, 200);
    console.log(`  ${method} ${url} -> ${r.status} [${ct}] ${preview}`);
    return r;
  } catch (err) {
    console.log(`  ${method} ${url} -> ERR ${err.code || err.message}`);
  }
}

(async () => {
  console.log('\n=== Step 1: load embed page (gives us cookies/csrf) ===');
  const embedPage = await tryRequest(
    'GET',
    `${base}/embeds/dash?dl_embed_token=${token}`,
    null,
    { Accept: 'text/html' },
  );

  // Extract csrf-token / config from HTML if present
  if (embedPage?.data && typeof embedPage.data === 'string') {
    fs.writeFileSync(path.join(__dirname, '..', 'tmp-embed.html'), embedPage.data);
    const dataMatch = embedPage.data.match(/window\.__DATA__\s*=\s*({[\s\S]+?});\s*</);
    if (dataMatch) {
      try {
        const parsed = JSON.parse(dataMatch[1]);
        fs.writeFileSync(path.join(__dirname, '..', 'tmp-embed-data.json'), JSON.stringify(parsed, null, 2));
        console.log('  __DATA__ keys:', Object.keys(parsed).join(', '));
        console.log('  DL keys:', Object.keys(parsed.DL || {}).join(', '));
        if (parsed.DL?.endpoints) console.log('  endpoints:', JSON.stringify(parsed.DL.endpoints).slice(0, 500));
        if (parsed.DL?.config) console.log('  config keys:', Object.keys(parsed.DL.config).join(', '));
        const findEndpoints = (obj, path = '', depth = 0) => {
          if (depth > 4 || !obj || typeof obj !== 'object') return;
          for (const k of Object.keys(obj)) {
            const v = obj[k];
            if (typeof v === 'string' && (v.includes('/api/') || v.includes('charts.') || v.startsWith('/'))) {
              console.log(`    ${path}.${k} = ${v.slice(0, 120)}`);
            } else if (typeof v === 'object') {
              findEndpoints(v, `${path}.${k}`, depth + 1);
            }
          }
        };
        console.log('\n  -- string fields with paths --');
        findEndpoints(parsed.DL || parsed);
      } catch (e) {
        console.log('  parse error:', e.message);
        console.log('  raw start:', dataMatch[1].slice(0, 500));
      }
    } else {
      console.log('  __DATA__ not found, full HTML saved to tmp-embed.html');
    }
  }

  console.log('\n=== Step 2: try embed data endpoints ===');
  const headers = { 'x-dl-embed-token': token, Authorization: `Bearer ${token}` };

  const targets = [
    ['POST', `${base}/api/run`, { id: '0e5yq5efn2lok', params: {} }],
    ['POST', `${base}/api/private/run`, { id: '0e5yq5efn2lok', params: {} }],
    ['POST', `${base}/api/charts/run`, { id: '0e5yq5efn2lok', params: {} }],
    ['POST', `${base}/embeds/api/run`, { id: '0e5yq5efn2lok', params: {} }],
    ['POST', `${base}/embeds/api/charts/run`, { id: '0e5yq5efn2lok', params: {} }],
    ['POST', `${base}/embeds/v1/run`, { id: '0e5yq5efn2lok', params: {} }],
    ['POST', `${base}/api/charts/v1/charts/0e5yq5efn2lok/run`, { params: {} }],
    ['GET',  `${base}/embeds/api/dashboard?embedToken=${token}`, null],
    ['POST', `${base}/api/charts/api/run`, { id: '0e5yq5efn2lok', params: {}, embedToken: token }],
    ['POST', `${base}/gateway/root/charts/api/run`, { id: '0e5yq5efn2lok', params: {} }],
    ['POST', `${base}/api/run-embed`, { id: '0e5yq5efn2lok', params: {}, embedToken: token }],
  ];

  for (const [method, url, body] of targets) {
    await tryRequest(method, url, body, headers);
  }
})().catch((e) => console.error('FATAL', e));
