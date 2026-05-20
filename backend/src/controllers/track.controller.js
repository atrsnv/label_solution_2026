function disabledLocalTracks(req, res) {
  res.status(410).json({
    error: 'Local tracks are disabled',
    message: 'Релизы, сплиты и статусы больше не сохраняются в локальной БД. Источник фактов по релизам — DataLens.',
  });
}

module.exports = {
  createTrack: disabledLocalTracks,
  getTrack: disabledLocalTracks,
  respondToSplit: disabledLocalTracks,
};
