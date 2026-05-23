const pool = require('../db');

// получение списка всех пользователей (для админа)
const getAllUsers = async (req, res) => {
    try {
        const users = await pool.query('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC');
        res.json(users.rows);
    } catch (err) {
        res.status(500).json({ error: 'ошибка при получении списка пользователей' });
    }
};

// удаление пользователя (модерация)
const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        // защита от случайного удаления самого себя
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'нельзя удалить собственный аккаунт администратора' });
        }
        
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'пользователь не найден' });
        
        res.json({ message: 'пользователь успешно удален' });
    } catch (err) {
        res.status(500).json({ error: 'ошибка при удалении пользователя' });
    }
};

module.exports = { getAllUsers, deleteUser };