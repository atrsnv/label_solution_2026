function disabledLocalFinance(req, res) {
  res.status(410).json({
    error: 'Local finance is disabled',
    message: 'Импорт отчётов, локальные начисления и выплаты отключены. Финансовые данные должны приходить из DataLens.',
  });
}

module.exports = {
  importReport: disabledLocalFinance,
  listReports: disabledLocalFinance,
  getReport: disabledLocalFinance,
};
