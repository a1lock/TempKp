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
        .on('headers', (headers) => {
            const normalized = headers.map(h => h.toLowerCase().trim());
            const hasId = normalized.includes('id');
            const hasPrice = normalized.includes('price');
            if (!hasId || !hasPrice) {
                // нельзя бросить ошибку внутри потока вместо этого ставим флаг и проверяем в 'end'
                results._invalidHeaders = true;
            }
        })
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            if (results._invalidHeaders) {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: 'CSV должен содержать колонки "id" и "price"' });
            }

            if (results.length === 0) {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: 'файл не содержит данных' });
            }

            try {
                let updatedCount = 0;
                let skippedCount = 0;

                for (let row of results) {
                    const rawId = row.id || row.Id || row.ID;
                    const rawPrice = row.price || row.Price || row.PRICE;

                    // id должен быть целым положительным числом
                    const itemId = parseInt(rawId, 10);
                    if (isNaN(itemId) || itemId <= 0 || String(itemId) !== String(rawId).trim()) {
                        skippedCount++;
                        continue;
                    }

                    // цена должна быть числом >= 0
                    const parsedPrice = parseFloat(String(rawPrice).replace(',', '.'));
                    if (isNaN(parsedPrice) || parsedPrice < 0) {
                        skippedCount++;
                        continue;
                    }

                    const result = await pool.query(
                        'UPDATE items SET price = $1 WHERE id = $2',
                        [parsedPrice, itemId]
                    );
                    if (result.rowCount > 0) {
                        updatedCount++;
                    } else {
                        skippedCount++; // предмет с таким id не найден
                    }
                }

                fs.unlinkSync(req.file.path);
                res.json({
                    message: `обновлено ${updatedCount} позиций, пропущено ${skippedCount}`,
                    updated: updatedCount,
                    skipped: skippedCount,
                });
            } catch (err) {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                res.status(500).json({ error: 'ошибка при обновлении цен в базе данных' });
            }
        })
        .on('error', () => {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            res.status(500).json({ error: 'ошибка при обработке файла' });
        });
};

module.exports = { getItems, uploadPrices };