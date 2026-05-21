const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const config = require('../config');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    labelShare: u.labelShare ?? 10,
  };
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Укажи email и пароль' });
    }
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(401).json({ error: 'Пользователь с таким email не найден' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Неверный пароль' });

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

// Регистрация по инвайт-токену (создаёт артиста)
async function registerByInvite(req, res, next) {
  try {
    const { token, name, password } = req.body;
    if (!token || !name || !password) {
      return res.status(400).json({ error: 'Укажи инвайт-токен, имя и пароль' });
    }
    const invite = await prisma.invite.findUnique({ where: { token } });
    if (!invite || invite.used || invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Инвайт недействителен или уже использован' });
    }

    const email = (req.body.email || invite.email || '').toLowerCase();
    if (!email) return res.status(400).json({ error: 'Укажи email' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Этот email уже зарегистрирован' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        role: 'ARTIST',
      },
    });

    await prisma.invite.update({ where: { id: invite.id }, data: { used: true } });

    const jwtToken = signToken(user);
    res.status(201).json({ token: jwtToken, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, registerByInvite, me };
