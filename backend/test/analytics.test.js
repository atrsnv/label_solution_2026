const assert = require('node:assert/strict');
const test = require('node:test');
const { addAmount, roundMoney } = require('../src/utils/analytics');

test('roundMoney normalizes floating point dust to zero', () => {
  assert.equal(roundMoney(1.818989403545856e-12), 0);
  assert.equal(roundMoney(-0.0001), 0);
});

test('roundMoney rounds monetary values to two decimals', () => {
  assert.equal(roundMoney(10.235), 10.23);
  assert.equal(roundMoney('42.499'), 42.5);
});

test('addAmount accumulates grouped money and preserves metadata', () => {
  const groups = new Map();

  addAmount(groups, 'artist-1', 10.1, { artistName: 'Artist One' });
  addAmount(groups, 'artist-1', '4.4', { artistName: 'Ignored' });
  addAmount(groups, 'artist-2', 7, { artistName: 'Artist Two' });

  assert.deepEqual(Array.from(groups.values()), [
    { artistName: 'Artist One', amount: 14.5 },
    { artistName: 'Artist Two', amount: 7 },
  ]);
});
