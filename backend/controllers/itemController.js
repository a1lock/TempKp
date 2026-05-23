const pool = require('../db');
const csv = require('csv-parser');
const fs = require('fs');

// получение каталога предметов с фильтрацией
const getItems = async (req, res) => {
    try {
        const { color } = req.query;
        let query = 'SELECT * FROM items';
        let params = [];
        
        if (color) {
            query += ' WHERE color_hex = $1';
            params.push(color);
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
                    if (row.id && row.price) {
                        await pool.query('UPDATE items SET price = $1 WHERE id = $2', [row.price, row.id]);
                    }
                }
                fs.unlinkSync(req.file.path); // удаление временного файла
                res.json({ message: 'цены успешно обновлены' });
            } catch (err) {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); // удаление при ошибке СУБД
                res.status(500).json({ error: 'ошибка при обновлении цен в базе данных' });
            }
        })
        .on('error', (err) => {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); // удаление при ошибке чтения файла
            res.status(500).json({ error: 'ошибка при обработке файла' });
        });
};

module.exports = { getItems, uploadPrices };