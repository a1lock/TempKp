const pool = require('../db');

// получение коллекций текущего пользователя
const getUserCollections = async (req, res) => {
    try {
        const collections = await pool.query('SELECT * FROM collections WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(collections.rows);
    } catch (err) {
        res.status(500).json({ error: 'ошибка при получении сборок' });
    }
};

// получение конкретной сборки с её предметами
const getCollectionById = async (req, res) => {
    const { id } = req.params;
    try {
        const col = await pool.query('SELECT * FROM collections WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (col.rows.length === 0) return res.status(404).json({ error: 'сборка не найдена' });

        const items = await pool.query(`
            SELECT i.* FROM items i
            JOIN collection_items ci ON i.id = ci.item_id
            WHERE ci.collection_id = $1
        `, [id]);

        res.json({ ...col.rows[0], items: items.rows });
    } catch (err) {
        res.status(500).json({ error: 'ошибка при получении данных сборки' });
    }
};

// создание новой сборки (транзакция через выделенного клиента)
const createCollection = async (req, res) => {
    const { title, itemIds } = req.body;
    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'название сборки не может быть пустым' });
    }

    const client = await pool.connect(); // получаем выделенного клиента из пула
    try {
        await client.query('BEGIN');

        const newCol = await client.query(
            'INSERT INTO collections (user_id, title) VALUES ($1, $2) RETURNING id',
            [req.user.id, title]
        );
        const collectionId = newCol.rows[0].id;

        if (itemIds && itemIds.length > 0) {
            const uniqueItemIds = [...new Set(itemIds)];
            for (let itemId of uniqueItemIds) {
                await client.query(
                    'INSERT INTO collection_items (collection_id, item_id) VALUES ($1, $2)',
                    [collectionId, itemId]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ id: collectionId, title, message: 'сборка успешно создана' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'ошибка при создании сборки' });
    } finally {
        client.release(); // освобождаем клиента
    }
};

// обновление существующей сборки (транзакция через выделенного клиента)
const updateCollection = async (req, res) => {
    const { id } = req.params;
    const { title, itemIds } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        if (title) {
            if (!title.trim()) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'название сборки не может быть пустым' });
            }
            const result = await client.query('UPDATE collections SET title = $1 WHERE id = $2 AND user_id = $3 RETURNING id', [title, id, req.user.id]);
            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'сборка не найдена или нет прав' });
            }
        }

        if (itemIds) {
            await client.query('DELETE FROM collection_items WHERE collection_id = $1', [id]);
            const uniqueItemIds = [...new Set(itemIds)];
            for (let itemId of uniqueItemIds) {
                await client.query('INSERT INTO collection_items (collection_id, item_id) VALUES ($1, $2)', [id, itemId]);
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'сборка успешно обновлена' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'ошибка при обновлении сборки' });
    } finally {
        client.release();
    }
};

// удаление сборки
const deleteCollection = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM collections WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'сборка не найдена или нет прав' });
        
        res.json({ message: 'сборка удалена' });
    } catch (err) {
        res.status(500).json({ error: 'ошибка при удалении сборки' });
    }
};

// экспорт сборки в формат CSV
const exportCollectionToCSV = async (req, res) => {
    const { id } = req.params;
    try {
        const col = await pool.query('SELECT title FROM collections WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (col.rows.length === 0) return res.status(404).json({ error: 'сборка не найдена' });

        const items = await pool.query(`
            SELECT i.market_name, i.weapon_type, i.rarity, i.exterior, i.price
            FROM items i
            JOIN collection_items ci ON i.id = ci.item_id
            WHERE ci.collection_id = $1
        `, [id]);

        let csvContent = '\uFEFF'; 
        csvContent += 'Название;Тип;Редкость;Качество;Цена (руб.)\n';
        
        for (let item of items.rows) {
            csvContent += `"${item.market_name}";"${item.weapon_type}";"${item.rarity}";"${item.exterior}";${item.price}\n`;
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=collection_${id}.csv`);
        res.status(200).send(csvContent);
    } catch (err) {
        res.status(500).json({ error: 'ошибка при экспорте сборки в CSV' });
    }
};

module.exports = { getUserCollections, getCollectionById, createCollection, updateCollection, deleteCollection, exportCollectionToCSV };