const { Router } = require('express');
const { login, registerByInvite, me } = require('../controllers/auth.controller');
const { isAuth } = require('../middlewares/auth');

const router = Router();

router.post('/login', login);
router.post('/register', registerByInvite); // регистрация по инвайт-токену
router.get('/me', isAuth, me);

module.exports = router;
