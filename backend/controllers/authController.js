const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// регистрация нового пользователя
const register = async (req, res) => {
    const { email, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role',
            [email, hash]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'ошибка при регистрации, возможно email уже занят' });
    }
};

// авторизация пользователя
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'пользователь не найден' });

        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) return res.status(400).json({ error: 'неверный пароль' });

        // генерация токена
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