const jwt = require('jsonwebtoken');

// проверка токена пользователя
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'нет доступа, токен не предоставлен' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'неверный или просроченный токен' });
    }
};

// проверка прав администратора
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'доступ запрещен, требуются права администратора' });
    }
    next();
};

module.exports = { verifyToken, requireAdmin };