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

        // привязка предметов к коллекции (фильтруем дубликаты для предотвращения ошибок бд)
        if (itemIds && itemIds.length > 0) {
            const uniqueItemIds = [...new Set(itemIds)];
            for (let itemId of uniqueItemIds) {
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

// получение конкретной сборки с её предметами
const getCollectionById = async (req, res) => {
    const { id } = req.params;
    try {
        // проверяем принадлежность сборки пользователю
        const col = await pool.query('SELECT * FROM collections WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (col.rows.length === 0) return res.status(404).json({ error: 'сборка не найдена' });

        // получаем предметы через кросс-таблицу
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

// обновление существующей сборки
const updateCollection = async (req, res) => {
    const { id } = req.params;
    const { title, itemIds } = req.body;
    try {
        await pool.query('BEGIN'); // начало транзакции
        
        // обновление названия
        if (title) {
            const result = await pool.query('UPDATE collections SET title = $1 WHERE id = $2 AND user_id = $3 RETURNING id', [title, id, req.user.id]);
            if (result.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(404).json({ error: 'сборка не найдена или нет прав' });
            }
        }

        // пересобираем предметы, если передан новый массив
        if (itemIds) {
            // удаляем старые связи
            await pool.query('DELETE FROM collection_items WHERE collection_id = $1', [id]);
            
            // добавляем новые связи (с защитой от дубликатов)
            const uniqueItemIds = [...new Set(itemIds)];
            for (let itemId of uniqueItemIds) {
                await pool.query('INSERT INTO collection_items (collection_id, item_id) VALUES ($1, $2)', [id, itemId]);
            }
        }

        await pool.query('COMMIT');
        res.json({ message: 'сборка успешно обновлена' });
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ error: 'ошибка при обновлении сборки' });
    }
};

// экспорт сборки в формат CSV (для отчетности)
const exportCollectionToCSV = async (req, res) => {
    const { id } = req.params;
    try {
        // проверяем принадлежность сборки пользователю
        const col = await pool.query('SELECT title FROM collections WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (col.rows.length === 0) return res.status(404).json({ error: 'сборка не найдена' });

        // получаем предметы через кросс-таблицу
        const items = await pool.query(`
            SELECT i.market_name, i.weapon_type, i.rarity, i.exterior, i.price
            FROM items i
            JOIN collection_items ci ON i.id = ci.item_id
            WHERE ci.collection_id = $1
        `, [id]);

        // формирование csv строки
        let csvContent = '\uFEFF'; // BOM для корректного отображения кириллицы в Excel
        csvContent += 'Название;Тип;Редкость;Качество;Цена (руб.)\n';
        
        for (let item of items.rows) {
            csvContent += `"${item.market_name}";"${item.weapon_type}";"${item.rarity}";"${item.exterior}";${item.price}\n`;
        }

        // отправка файла пользователю
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=collection_${id}.csv`);
        res.status(200).send(csvContent);
    } catch (err) {
        res.status(500).json({ error: 'ошибка при экспорте сборки в CSV' });
    }
};

module.exports = { getUserCollections, getCollectionById, createCollection, updateCollection, deleteCollection, exportCollectionToCSV };