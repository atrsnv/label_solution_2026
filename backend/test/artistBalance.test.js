const assert = require('node:assert/strict');
const test = require('node:test');
const {
  applyPayoutsToArtistDashboard,
  getDeductedPayoutTotal,
} = require('../src/utils/artistBalance');

test('getDeductedPayoutTotal subtracts requested and paid payouts only', () => {
  const total = getDeductedPayoutTotal([
    { amount: 100, status: 'REQUESTED' },
    { amount: 50, status: 'PAID' },
    { amount: 20, status: 'REJECTED' },
  ]);

  assert.equal(total, 150);
});

test('applyPayoutsToArtistDashboard keeps earned total and updates available balance', () => {
  const dashboard = applyPayoutsToArtistDashboard(
    {
      summary: {
        totalEarned: 653625,
        balance: 653625,
      },
    },
    [{ amount: 10000, status: 'REQUESTED' }],
  );

  assert.equal(dashboard.summary.totalEarned, 653625);
  assert.equal(dashboard.summary.deductedPayouts, 10000);
  assert.equal(dashboard.summary.balance, 643625);
});
