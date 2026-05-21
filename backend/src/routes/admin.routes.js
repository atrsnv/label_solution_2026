const { Router } = require('express');
const { isAuth, isAdmin } = require('../middlewares/auth');
const admin = require('../controllers/admin.controller');
const finance = require('../controllers/finance.controller');
const payout = require('../controllers/payout.controller');
const deal = require('../controllers/deal.controller');
const upload = require('../middlewares/upload');

const router = Router();

router.use(isAuth, isAdmin);

// Dashboard
router.get('/dashboard/summary', admin.dashboardSummary);
router.get('/analytics', admin.analytics);
router.get('/datalens-dashboard', admin.datalensDashboard);

// Artists
router.get('/artists', admin.listArtists);
router.post('/artists', admin.createArtistDirect);
router.post('/artists/invite', admin.createInvite);
router.get('/artists/:id', admin.getArtist);
router.patch('/artists/:id', admin.updateArtist);
router.delete('/artists/:id', admin.deleteArtist);

// Tracks (полный реестр)
router.get('/tracks', admin.listAllTracks);
router.patch('/releases/:id', admin.updateRelease);

// Direct deals
router.get('/deals', deal.listDeals);
router.post('/deals', deal.createDeal);

// Finance
router.post('/finance/import', upload.single('file'), finance.importReport);
router.get('/finance/reports', finance.listReports);
router.get('/finance/reports/:id', finance.getReport);

// Payouts
router.get('/payouts', payout.listPayouts);
router.patch('/payouts/:id', payout.updatePayout);

module.exports = router;
