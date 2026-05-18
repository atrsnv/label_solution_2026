const { Router } = require('express');
const { isAuth } = require('../middlewares/auth');
const track = require('../controllers/track.controller');

const router = Router();
router.use(isAuth);

// Создать релиз (артист — владелец)
router.post('/', track.createTrack);

// Получить трек (владелец / участник сплита / админ)
router.get('/:id', track.getTrack);

// Ответ на сплит (принять / оспорить) — для приглашённого артиста
router.post('/:id/splits/respond', track.respondToSplit);

module.exports = router;
