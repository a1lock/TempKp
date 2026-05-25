const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// регистрация нового пользователя
const register = async (req, res) => {
    const { email, password } = req.body;

    // валидация входных данных
    if (!email || !password) {
        return res.status(400).json({ error: 'заполните все обязательные поля' });
    }
    if (!email.includes('@')) {
        return res.status(400).json({ error: 'неверный формат email' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'пароль должен быть не менее 6 символов' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role',
            [email, hash]
        );
        const { id, email: userEmail, role } = newUser.rows[0];
        const token = jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token, user: { id, email: userEmail, role } });
    } catch (err) {
        // обработка уникального ключа бд (23505 - код ошибки дубликата в postgres)
        if (err.code === '23505') {
            return res.status(400).json({ error: 'данный email уже зарегистрирован' });
        }
        res.status(500).json({ error: 'ошибка при регистрации' });
    }
};

// авторизация пользователя
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'заполните все обязательные поля' });
    }

    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'пользователь не найден' });

        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) return res.status(400).json({ error: 'неверный пароль' });

        const token = jwt.sign(
            { id: user.rows[0].id, role: user.rows[0].role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.rows[0].id, email: user.rows[0].email, role: user.rows[0].role } });
    } catch (err) {
        res.status(500).json({ error: 'ошибка сервера при авторизации' });
    }
};

module.exports = { register, login };