const { Router } = require('express');
const { isAuth, isArtist } = require('../middlewares/auth');
const artist = require('../controllers/artist.controller');
const payout = require('../controllers/payout.controller');

const router = Router();
router.use(isAuth, isArtist);

router.get('/dashboard', artist.dashboard);
router.get('/analytics', artist.analytics);
router.get('/tracks', artist.myTracks);
router.get('/invites', artist.myInvites);
router.get('/wallet', artist.wallet);
router.post('/wallet/withdraw', payout.requestWithdraw);
router.get('/wallet/payouts', payout.listMyPayouts);
router.get('/profile', payout.getProfile);
router.patch('/profile', payout.updateProfile);

module.exports = router;
