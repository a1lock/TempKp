const pool = require('../db');

// получение коллекций текущего пользователя
const getUserCollections = async (req, res) => {
    try {
        const collections = await pool.query('SELECT * FROM collections WHERE user_id = $1', [req.user.id]);
        res.json(collections.rows);
    } catch (err) {
        res.status(500).json({ error: 'ошибка при получении сборок' });
    }
};

// создание новой сборки
const createCollection = async (req, res) => {
    const { title, itemIds } = req.body; // itemIds - массив id предметов
    try {
        await pool.query('BEGIN'); // начало транзакции

        // создание записи коллекции
        const newCol = await pool.query(
            'INSERT INTO collections (user_id, title) VALUES ($1, $2) RETURNING id',
            [req.user.id, title]
        );
        const collectionId = newCol.rows[0].id;

        // привязка предметов к коллекции
        if (itemIds && itemIds.length > 0) {
            for (let itemId of itemIds) {
                await pool.query(
                    'INSERT INTO collection_items (collection_id, item_id) VALUES ($1, $2)',
                    [collectionId, itemId]
                );
            }
        }

        await pool.query('COMMIT'); // подтверждение транзакции
        res.status(201).json({ id: collectionId, title, message: 'сборка успешно создана' });
    } catch (err) {
        await pool.query('ROLLBACK'); // откат при ошибке
        res.status(500).json({ error: 'ошибка при создании сборки' });
    }
};

// удаление сборки
const deleteCollection = async (req, res) => {
    const { id } = req.params;
    try {
        // удаляем только если сборка принадлежит пользователю
        const result = await pool.query('DELETE FROM collections WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'сборка не найдена или нет прав' });
        
        res.json({ message: 'сборка удалена' });
    } catch (err) {
        res.status(500).json({ error: 'ошибка при удалении сборки' });
    }
};

module.exports = { getUserCollections, createCollection, deleteCollection };