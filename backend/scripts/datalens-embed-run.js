/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
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

const base = DATALENS_EMBED_BASE_URL.replace(/\/$/, '');
const jar = new tough.CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true, validateStatus: () => true, maxRedirects: 5 }));

const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept-Language': 'ru,en;q=0.9',
};

async function step1() {
  console.log('\n=== Step 1: visit embed page (set cookies) ===');
  const r = await client.get(`${base}/embeds/dash?dl_embed_token=${token}`, {
    headers: { ...browserHeaders, Accept: 'text/html,application/xhtml+xml' },
  });
  console.log(`  GET /embeds/dash -> ${r.status} (${r.headers['content-type']})`);
  const cookies = await jar.getCookies(base);
  console.log('  cookies:', cookies.map((c) => `${c.key}=${c.value.slice(0, 20)}...`).join('; ') || '(none)');
  return r;
}

async function callRun(chartId, urlPath = '/embeds/api/run') {
  console.log(`\n=== Calling POST ${urlPath} for chart ${chartId} ===`);
  const r = await client.post(
    `${base}${urlPath}`,
    {
      id: chartId,
      params: {},
      widgetType: 'graph_node',
      responseOptions: { includeLogs: false },
    },
    {
      headers: {
        ...browserHeaders,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-dl-embed-token': token,
        Referer: `${base}/embeds/dash?dl_embed_token=${token}`,
        Origin: base,
      },
    },
  );
  console.log(`  status: ${r.status} (${r.headers['content-type']})`);
  const preview = typeof r.data === 'string' ? r.data.slice(0, 400) : JSON.stringify(r.data).slice(0, 600);
  console.log(`  body: ${preview}`);
  return r;
}

(async () => {
  await step1();

  // Admin chart IDs found earlier
  const charts = ['m0rkcq6fy4ck6', '0e5yq5efn2lok', 'm0rkcsh3kp8o6'];
  for (const cid of charts) {
    try { await callRun(cid); } catch (e) { console.log('  ERR', e.message); }
  }

  // Also try /embeds/api/run-activity
  try { await callRun('m0rkcq6fy4ck6', '/embeds/api/run-activity'); } catch (e) { console.log('  ERR', e.message); }
})();
