const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../config');
const { parseDatalensCsv } = require('../utils/datalensDashboard');

const DEFAULT_TITLES = {
  admin: 'ERP: Новые данные. Панель администратора',
  artist: 'ERP: Новые данные. Панель артиста',
};

let metaCache = new Map();

function normalizeRpcBaseUrl(baseUrl = '') {
  const clean = String(baseUrl || 'https://api.datalens.tech').replace(/\/$/, '');

  if (clean.includes('api.datalens.tech')) return clean;
  if (clean.includes('datalens.yandex')) return 'https://api.datalens.tech';

  return clean;
}

function getFallbackCsvPath() {
  const filePath = config.datalens.dataFilePath || 'sample-data/label_financial_analytics_rich.csv';

  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(__dirname, '..', '..', filePath);
}

function normalizeDatalensRows(payload) {
  if (typeof payload === 'string') return parseDatalensCsv(payload);

  const rows = Array.isArray(payload)
    ? payload
    : payload?.rows || payload?.data || payload?.result || [];

  return rows.map((row) => ({
    transaction_id: String(row.transaction_id || row.transactionId || row.id || ''),
    date: String(row.date || row.period || row.createdAt || ''),
    track_id: String(row.track_id || row.trackId || ''),
    track_title: String(row.track_title || row.trackTitle || row.title || ''),
    artist_id: String(row.artist_id || row.artistId || ''),
    artist_name: String(row.artist_name || row.artistName || ''),
    role: String(row.role || ''),
    income_type: String(row.income_type || row.incomeType || ''),
    source: String(row.source || ''),
    revenue_gross: Number(row.revenue_gross ?? row.revenueGross ?? 0),
    revenue_net: Number(row.revenue_net ?? row.revenueNet ?? row.amount ?? 0),
    streams: Number(row.streams ?? 0),
  }));
}

async function fetchDatalensRpc(method, body) {
  const { iamToken, orgId, baseUrl } = config.datalens;

  if (!iamToken || !orgId) return null;

  const response = await axios.post(
    `${normalizeRpcBaseUrl(baseUrl)}/rpc/${method}`,
    body,
    {
      headers: {
        Authorization: `Bearer ${iamToken}`,
        'x-dl-api-version': '1',
        'x-dl-org-id': orgId,
        'Content-Type': 'application/json',
      },
      timeout: 2500,
    },
  );

  return response.data;
}

async function getDashboardMeta(scope) {
  const entryId = scope === 'artist'
    ? config.datalens.artistEntryId
    : config.datalens.adminEntryId || config.datalens.entryId;
  const fallbackTitle = DEFAULT_TITLES[scope] || DEFAULT_TITLES.artist;

  if (!entryId) return { dashboardTitle: fallbackTitle, entryId: null };

  const cacheKey = `${scope}:${entryId}`;
  const cached = metaCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let value = { dashboardTitle: fallbackTitle, entryId };

  try {
    const data = await fetchDatalensRpc('getDashboard', {
      dashboardId: entryId,
      branch: 'saved',
      includeLinks: true,
      includeFavorite: false,
      includePermissions: false,
    });

    const entry = data?.entry || {};
    value = {
      dashboardTitle: entry.meta?.title || entry.key || fallbackTitle,
      entryId: entry.entryId || entryId,
      revId: entry.revId || null,
      publishedId: entry.publishedId || null,
      workbookId: entry.workbookId || null,
    };
  } catch (error) {
    value = {
      ...value,
      apiStatus: 'unavailable',
      apiError: error.response?.status || error.code || 'UNKNOWN',
    };
  }

  metaCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + 60_000,
  });

  return value;
}

async function loadRemoteRows() {
  const { dataUrl, iamToken, orgId } = config.datalens;

  if (!dataUrl) return null;

  const response = await axios.get(dataUrl, {
    responseType: 'text',
    timeout: 10000,
    transformResponse: [(data) => data],
    headers: {
      ...(iamToken ? { Authorization: `Bearer ${iamToken}` } : {}),
      ...(orgId ? { 'x-dl-org-id': orgId } : {}),
    },
  });

  const contentType = String(response.headers['content-type'] || '');
  if (contentType.includes('application/json')) {
    return normalizeDatalensRows(JSON.parse(response.data));
  }

  return normalizeDatalensRows(response.data);
}

async function loadDatalensRows(scope = 'artist') {
  const dashboard = await getDashboardMeta(scope);

  try {
    const remoteRows = await loadRemoteRows();
    if (remoteRows) {
      return {
        rows: remoteRows,
        source: {
          mode: 'datalens-export',
          dashboardTitle: dashboard.dashboardTitle,
          entryId: dashboard.entryId,
          dataUrlConfigured: true,
          apiStatus: dashboard.apiStatus || 'ok',
        },
      };
    }
  } catch (error) {
    const fallbackContent = fs.readFileSync(getFallbackCsvPath(), 'utf8');

    return {
      rows: parseDatalensCsv(fallbackContent),
      source: {
        mode: 'local-csv-fallback',
        dashboardTitle: dashboard.dashboardTitle,
        entryId: dashboard.entryId,
        dataUrlConfigured: true,
        fallbackReason: error.response?.status || error.code || 'REMOTE_DATA_UNAVAILABLE',
        apiStatus: dashboard.apiStatus || 'ok',
      },
    };
  }

  const content = fs.readFileSync(getFallbackCsvPath(), 'utf8');

  return {
    rows: parseDatalensCsv(content),
    source: {
      mode: 'local-csv-fallback',
      dashboardTitle: dashboard.dashboardTitle,
      entryId: dashboard.entryId,
      dataUrlConfigured: false,
      fallbackReason: 'DATALENS_DATA_URL_NOT_SET',
      apiStatus: dashboard.apiStatus || 'ok',
    },
  };
}

function clearDatalensSourceCache() {
  metaCache = new Map();
}

module.exports = {
  clearDatalensSourceCache,
  getDashboardMeta,
  loadDatalensRows,
  normalizeDatalensRows,
  normalizeRpcBaseUrl,
};
