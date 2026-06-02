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

// создание новой сборки
const createCollection = async (req, res) => {
    const { title, itemIds } = req.body;
    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'название сборки не может быть пустым' });
    }

    // pool.connect() даёт нам конкретное соединение нужно, чтобы BEGIN/COMMIT/ROLLBACK работали в одной сессии
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // запрещаем добавлять два разных износа одного скина (например, FN и FT одного AK)
        if (itemIds && itemIds.length > 0) {
            const itemsData = await client.query('SELECT market_name FROM items WHERE id = ANY($1::bigint[])', [itemIds]);
            const baseNames = [];

            for (let row of itemsData.rows) {
                // базовое имя всё до скобки с износом: "AK-47 | Slate (Field-Tested)" -> "AK-47 | Slate"
                const baseName = row.market_name.split(' (')[0];
                
                if (baseNames.includes(baseName)) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ 
                        error: `в одной сборке не может быть нескольких вариантов одного предмета (обнаружен дубликат: ${baseName})` 
                    });
                }
                baseNames.push(baseName);
            }
        }

        // проверка уникальности названия среди наборов этого пользователя
        const duplicate = await client.query(
            'SELECT id FROM collections WHERE user_id = $1 AND LOWER(title) = LOWER($2)',
            [req.user.id, title.trim()]
        );
        if (duplicate.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: `набор с названием "${title}" уже существует` });
        }

        // создание записи коллекции
        const newCol = await client.query(
            'INSERT INTO collections (user_id, title) VALUES ($1, $2) RETURNING id',
            [req.user.id, title]
        );
        const collectionId = newCol.rows[0].id;

        if (itemIds && itemIds.length > 0) {
            // Set убирает дубли на случай, если клиент случайно прислал один id дважды
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
        // откатываем все изменения либо всё сохраняется целиком, либо ничего
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'ошибка при создании сборки' });
    } finally {
        // release() обязателен в finally возвращает соединение в пул даже при ошибке
        client.release();
    }
};

// обновление существующей сборки
const updateCollection = async (req, res) => {
    const { id } = req.params;
    const { title, itemIds } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // всегда проверяем владельца до любых изменений
        const owned = await client.query(
            'SELECT id FROM collections WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );
        if (owned.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'сборка не найдена или нет прав' });
        }

        if (title) {
            if (!title.trim()) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'название сборки не может быть пустым' });
            }

            // проверяем что название не занято другим набором этого пользователя
            const duplicate = await client.query(
                'SELECT id FROM collections WHERE user_id = $1 AND LOWER(title) = LOWER($2) AND id != $3',
                [req.user.id, title.trim(), id]
            );
            if (duplicate.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({ error: `набор с названием "${title}" уже существует` });
            }

            await client.query('UPDATE collections SET title = $1 WHERE id = $2', [title, id]);
        }

        // проверяем предметы на уникальность базовых названий перед обновлением
        if (itemIds && itemIds.length > 0) {
            const itemsData = await client.query('SELECT market_name FROM items WHERE id = ANY($1::bigint[])', [itemIds]);
            const baseNames = [];

            for (let row of itemsData.rows) {
                const baseName = row.market_name.split(' (')[0];

                if (baseNames.includes(baseName)) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        error: `в одной сборке не может быть нескольких вариантов одного предмета (обнаружен дубликат: ${baseName})`
                    });
                }
                baseNames.push(baseName);
            }
        }

        if (itemIds) {
            // проще удалить все связи и вставить заново, чем вычислять diff
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
        // Content-Disposition: attachment говорит браузеру скачать файл, а не показывать его
        res.setHeader('Content-Disposition', `attachment; filename=collection_${id}.csv`);
        res.status(200).send(csvContent);
    } catch (err) {
        res.status(500).json({ error: 'ошибка при экспорте сборки в CSV' });
    }
};

module.exports = { getUserCollections, getCollectionById, createCollection, updateCollection, deleteCollection, exportCollectionToCSV };