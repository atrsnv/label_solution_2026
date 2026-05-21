/* eslint-disable no-console */
require('dotenv').config();
const axios = require('axios');

const {
  DATALENS_BASE_URL = 'https://api.datalens.tech',
  DATALENS_IAM_TOKEN,
  DATALENS_ORG_ID,
  DATALENS_ENTRY_ID,
  DATALENS_ADMIN_ENTRY_ID,
  DATALENS_ARTIST_ENTRY_ID,
} = process.env;

const baseUrl = DATALENS_BASE_URL.replace(/\/$/, '');
const headers = {
  Authorization: `Bearer ${DATALENS_IAM_TOKEN}`,
  'x-dl-api-version': '1',
  'x-dl-org-id': DATALENS_ORG_ID,
  'Content-Type': 'application/json',
};

const candidates = [
  { name: 'admin', id: DATALENS_ADMIN_ENTRY_ID || DATALENS_ENTRY_ID },
  { name: 'artist', id: DATALENS_ARTIST_ENTRY_ID },
].filter((c) => c.id);

async function rpc(method, body) {
  const url = `${baseUrl}/rpc/${method}`;
  try {
    const res = await axios.post(url, body, { headers, timeout: 8000 });
    return { ok: true, status: res.status, data: res.data };
  } catch (err) {
    return {
      ok: false,
      status: err.response?.status,
      code: err.code,
      data: err.response?.data,
      message: err.message,
    };
  }
}

function summarizeDashboard(data) {
  const entry = data?.entry || data;
  const tabs = entry?.data?.tabs || entry?.tabs || [];
  const widgets = [];

  tabs.forEach((tab, tabIdx) => {
    (tab.items || []).forEach((item) => {
      if (item.type !== 'widget' && item.type !== 'chart_widget') return;
      const data = item.data || {};
      (data.tabs || [data]).forEach((wTab) => {
        widgets.push({
          tabIdx,
          tabTitle: tab.title,
          widgetTitle: wTab.title || data.title,
          chartId: wTab.chartId || data.chartId || wTab.entryId || data.entryId,
        });
      });
    });
  });

  return {
    title: entry?.meta?.title || entry?.key,
    entryId: entry?.entryId,
    widgets,
  };
}

async function checkIamToken() {
  try {
    const res = await axios.get(
      'https://iam.api.cloud.yandex.net/iam/v1/tokens:current',
      { headers: { Authorization: `Bearer ${DATALENS_IAM_TOKEN}` }, timeout: 5000 },
    );
    console.log('IAM token: VALID, expires', res.data?.expiresAt, 'subject', res.data?.subject?.id);
    return true;
  } catch (err) {
    console.log('IAM token check FAILED:', err.response?.status, err.response?.data || err.message);
    return false;
  }
}

async function probeBase(testBaseUrl, candidate) {
  const url = `${testBaseUrl.replace(/\/$/, '')}/rpc/getDashboard`;
  try {
    const res = await axios.post(
      url,
      { dashboardId: candidate.id, branch: 'saved' },
      { headers, timeout: 8000 },
    );
    return { ok: true, status: res.status, data: res.data };
  } catch (err) {
    return { ok: false, status: err.response?.status, code: err.code, data: err.response?.data, message: err.message };
  }
}

const BASE_CANDIDATES = [
  baseUrl,
  'https://datalens.yandex.cloud',
  'https://datalens.yandex.cloud/gateway/root/bi',
  'https://datalens.yandex.cloud/gateway/root/us',
];

(async () => {
  console.log('=== DataLens probe ===');
  console.log('baseUrl:', baseUrl);
  console.log('orgId:', DATALENS_ORG_ID);
  console.log('iamToken set:', Boolean(DATALENS_IAM_TOKEN), 'length:', DATALENS_IAM_TOKEN?.length);

  console.log('\n--- base URL discovery ---');
  for (const candidate of candidates.slice(0, 1)) {
    for (const tryBase of BASE_CANDIDATES) {
      const r = await probeBase(tryBase, candidate);
      console.log(`  ${tryBase}: ${r.ok ? 'OK ' + r.status : 'FAIL ' + (r.status || r.code) + ' ' + JSON.stringify(r.data || r.message).slice(0, 120)}`);
    }
  }

  for (const candidate of candidates) {
    console.log(`\n--- ${candidate.name} dashboard ${candidate.id} ---`);
    const result = await rpc('getDashboard', {
      dashboardId: candidate.id,
      branch: 'saved',
      includeLinks: true,
    });

    if (!result.ok) {
      console.log('FAILED', result.status, result.code, result.message);
      console.log('payload:', JSON.stringify(result.data, null, 2)?.slice(0, 800));
      continue;
    }

    const summary = summarizeDashboard(result.data);
    console.log('title:', summary.title);
    console.log('widgets:', summary.widgets.length);
    summary.widgets.forEach((w, i) =>
      console.log(`  [${i}] ${w.widgetTitle || '(no title)'} -> chart ${w.chartId}`));

    const firstChart = summary.widgets.find((w) => w.chartId);
    if (firstChart) {
      const cid = firstChart.chartId;
      console.log(`\nProbing chart ${cid}...`);

      const rpcMethods = ['getEntryMeta', 'getEntry', 'getEntryByKey', 'getChart', 'getChartData', 'runChart', 'executeChart', 'getResult', 'chartsRun'];
      for (const method of rpcMethods) {
        const r = await rpc(method, { id: cid, entryId: cid, dashboardId: cid });
        if (r.ok) {
          const keys = Object.keys(r.data || {}).slice(0, 10);
          console.log(`  rpc/${method}: OK keys: ${keys.join(', ')}`);
        }
      }

      const targets = [
        ['POST', `https://datalens.tech/gateway/root/charts/api/run`, { id: cid, params: {} }],
        ['GET',  `https://datalens.tech/gateway/root/charts/api/run`, null],
        ['POST', `https://datalens.tech/gateway/root/charts/api/private/run`, { id: cid, params: {} }],
        ['POST', `https://datalens.tech/gateway/root/charts/api/charts/v1/charts/${cid}/run`, { params: {} }],
        ['POST', `https://datalens.tech/gateway/root/us/v1/entries/${cid}`, null],
        ['GET',  `https://datalens.tech/gateway/root/us/v1/entries/${cid}`, null],
        ['POST', `https://datalens.tech/gateway/root/us/private/entries/getEntry`, { entryId: cid }],
        ['POST', `https://datalens.tech/gateway/api/charts/api/run`, { id: cid, params: {} }],
        ['POST', `https://datalens.tech/api/charts/run`, { id: cid, params: {} }],
        ['GET',  `https://datalens.tech/embeds/chart/${cid}`, null],
        ['POST', `${baseUrl}/v1/embed/run`, { id: cid }],
      ];
      for (const [verb, url, body] of targets) {
        try {
          const r = await axios.request({ method: verb, url, headers, timeout: 8000, data: body });
          const keys = Object.keys(r.data || {}).slice(0, 12);
          console.log(`  ${verb} ${url}: OK ${r.status} keys: ${keys.join(', ')}`);
        } catch (err) {
          const s = err.response?.status;
          const body = JSON.stringify(err.response?.data || '').slice(0, 120);
          if (s && s !== 404) console.log(`  ${verb} ${url}: ${s} ${body}`);
        }
      }
    }
  }
})();
