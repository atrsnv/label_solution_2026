const { roundMoney } = require('./analytics');

const DEDUCTED_PAYOUT_STATUSES = new Set(['REQUESTED', 'PAID']);

function getDeductedPayoutTotal(payouts = []) {
  return roundMoney(
    payouts
      .filter((payout) => DEDUCTED_PAYOUT_STATUSES.has(payout.status))
      .reduce((sum, payout) => sum + Number(payout.amount || 0), 0),
  );
}

function applyPayoutsToArtistDashboard(datalensDashboard, payouts = []) {
  const totalEarned = Number(datalensDashboard?.summary?.totalEarned || 0);
  const deductedPayouts = getDeductedPayoutTotal(payouts);
  const balance = roundMoney(Math.max(totalEarned - deductedPayouts, 0));

  return {
    ...datalensDashboard,
    summary: {
      ...datalensDashboard.summary,
      balance,
      deductedPayouts,
    },
  };
}

module.exports = {
  applyPayoutsToArtistDashboard,
  getDeductedPayoutTotal,
};
