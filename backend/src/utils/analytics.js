function roundMoney(value) {
  const amount = Number(value) || 0;
  return Math.abs(amount) < 0.005 ? 0 : Number(amount.toFixed(2));
}

function addAmount(map, key, amount, extra = {}) {
  if (!map.has(key)) map.set(key, { ...extra, amount: 0 });
  const item = map.get(key);
  item.amount += Number(amount) || 0;
}

module.exports = {
  addAmount,
  roundMoney,
};
