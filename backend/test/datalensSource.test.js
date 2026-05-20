const assert = require('node:assert/strict');
const test = require('node:test');
const {
  normalizeDatalensRows,
  normalizeRpcBaseUrl,
} = require('../src/services/datalensSource.service');

test('normalizeRpcBaseUrl uses the public DataLens API host', () => {
  assert.equal(
    normalizeRpcBaseUrl('https://datalens.yandex'),
    'https://api.datalens.tech',
  );
  assert.equal(
    normalizeRpcBaseUrl('https://api.datalens.tech/'),
    'https://api.datalens.tech',
  );
});

test('normalizeDatalensRows accepts JSON rows from a DataLens export adapter', () => {
  const rows = normalizeDatalensRows([
    {
      transactionId: 'TX-1',
      date: '2026-05-01',
      trackId: 'TRK-1',
      trackTitle: 'Track',
      artistId: 'ART-1',
      artistName: 'Artist',
      incomeType: 'Стриминг',
      revenueGross: '100',
      revenueNet: '70',
      streams: '1000',
    },
  ]);

  assert.deepEqual(rows, [
    {
      transaction_id: 'TX-1',
      date: '2026-05-01',
      track_id: 'TRK-1',
      track_title: 'Track',
      artist_id: 'ART-1',
      artist_name: 'Artist',
      role: '',
      income_type: 'Стриминг',
      source: '',
      revenue_gross: 100,
      revenue_net: 70,
      streams: 1000,
    },
  ]);
});
