const assert = require('node:assert/strict');
const test = require('node:test');
const {
  buildAdminDatalensDashboard,
  parseDatalensCsv,
} = require('../src/utils/datalensDashboard');

test('parseDatalensCsv parses numeric DataLens rows', () => {
  const rows = parseDatalensCsv([
    'transaction_id,date,track_id,track_title,artist_id,artist_name,role,income_type,source,revenue_gross,revenue_net,streams',
    'TX-1,2026-03-01,TRK-1,Song,LABEL,Лейбл,Лейбл,Стриминг,Яндекс Музыка,100,30,1000',
    'TX-2,2026-03-01,TRK-1,Song,ART-1,Artist,Автор,Стриминг,Яндекс Музыка,100,70,1000',
  ].join('\n'));

  assert.equal(rows.length, 2);
  assert.equal(rows[0].revenue_net, 30);
  assert.equal(rows[1].streams, 1000);
});

test('buildAdminDatalensDashboard aggregates label and artist metrics', () => {
  const rows = parseDatalensCsv([
    'transaction_id,date,track_id,track_title,artist_id,artist_name,role,income_type,source,revenue_gross,revenue_net,streams',
    'TX-1,2026-03-01,TRK-1,Song,LABEL,Лейбл,Лейбл,Стриминг,Яндекс Музыка,100,30,1000',
    'TX-2,2026-03-01,TRK-1,Song,ART-1,Artist,Автор,Стриминг,Яндекс Музыка,100,70,1000',
  ].join('\n'));

  const dashboard = buildAdminDatalensDashboard(rows);

  assert.equal(dashboard.summary.totalTurnover, 100);
  assert.equal(dashboard.summary.labelProfit, 30);
  assert.equal(dashboard.summary.artistPayouts, 70);
  assert.equal(dashboard.summary.totalStreams, 1000);
  assert.deepEqual(dashboard.byArtist, [
    { artistId: 'ART-1', artistName: 'Artist', amount: 70 },
  ]);
  assert.equal(dashboard.profitability[0].labelSharePercent, 30);
});
