const pool = require('../db');
const csv = require('csv-parser');
const fs = require('fs');

// получение каталога предметов с динамической фильтрацией
const getItems = async (req, res) => {
    try {
        const { color, type, exterior, minPrice, maxPrice } = req.query;
        let query = 'SELECT * FROM items WHERE 1=1';
        let params = [];
        let paramIndex = 1;

        if (color) {
            query += ` AND color_hex = $${paramIndex}`;
            params.push(color);
            paramIndex++;
        }
        if (type) {
            query += ` AND weapon_type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }
        if (exterior) {
            query += ` AND exterior = $${paramIndex}`;
            params.push(exterior);
            paramIndex++;
        }
        if (minPrice) {
            query += ` AND price >= $${paramIndex}`;
            params.push(minPrice);
            paramIndex++;
        }
        if (maxPrice) {
            query += ` AND price <= $${paramIndex}`;
            params.push(maxPrice);
            paramIndex++;
        }

        const items = await pool.query(query, params);
        res.json(items.rows);
    } catch (err) {
        res.status(500).json({ error: 'ошибка при получении каталога предметов' });
    }
};

// обновление цен предметов из csv файла
const uploadPrices = (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'файл не загружен' });

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                for (let row of results) {
                    // нормализация заголовков csv (поддержка разного регистра)
                    const itemId = row.id || row.Id || row.ID;
                    const itemPrice = row.price || row.Price || row.PRICE;

                    if (itemId && itemPrice) {
                        const parsedPrice = parseFloat(itemPrice);
                        // валидация цены перед сохранением
                        if (!isNaN(parsedPrice) && parsedPrice >= 0) {
                            await pool.query('UPDATE items SET price = $1 WHERE id = $2', [parsedPrice, itemId]);
                        }
                    }
                }
                fs.unlinkSync(req.file.path); // удаление временного файла
                res.json({ message: 'цены успешно обновлены' });
            } catch (err) {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                res.status(500).json({ error: 'ошибка при обновлении цен в базе данных' });
            }
        })
        .on('error', (err) => {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            res.status(500).json({ error: 'ошибка при обработке файла' });
        });
};

module.exports = { getItems, uploadPrices };