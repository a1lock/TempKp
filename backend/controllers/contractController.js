const pool = require('../db');

// расчет контракта
const calculateContract = async (req, res) => {
    const { itemIds, inputFloats, targetItemId } = req.body; 

    if (!itemIds || itemIds.length !== 10 || !inputFloats || inputFloats.length !== 10 || !targetItemId) {
        return res.status(400).json({ error: 'необходимы 10 предметов, их износ и целевой предмет' });
    }

    const client = await pool.connect(); // получаем выделенного клиента из пула
    try {
        await client.query('BEGIN');

        // получаем данные целевого предмета из бд
        const target = await client.query('SELECT price, min_float, max_float FROM items WHERE id = $1', [targetItemId]);
        if (target.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'целевой предмет не найден' });
        }

        const targetPrice = parseFloat(target.rows[0].price);
        const targetMinFloat = target.rows[0].min_float;
        const targetMaxFloat = target.rows[0].max_float;

        // получаем цены входных предметов с жесткой проверкой их существования
        let totalCost = 0;
        for (let id of itemIds) {
            const item = await client.query('SELECT price FROM items WHERE id = $1', [id]);
            if (item.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: `предмет с id ${id} не найден в базе данных` });
            }
            totalCost += parseFloat(item.rows[0].price);
        }

        // считаем средний износ входа
        const avgFloat = inputFloats.reduce((acc, val) => acc + val, 0) / 10;

        // формула расчета итогового износа
        const resultFloat = (avgFloat * (targetMaxFloat - targetMinFloat)) + targetMinFloat;
        const expectedProfit = targetPrice - totalCost;

        // сохраняем результат
        const contract = await client.query(
            'INSERT INTO contracts (user_id, input_items_cost, expected_profit, result_float, result_item_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [req.user.id, totalCost, expectedProfit, resultFloat, targetItemId]
        );
        const contractId = contract.rows[0].id;

        // группируем дубликаты
        const itemCounts = {};
        for (let id of itemIds) {
            itemCounts[id] = (itemCounts[id] || 0) + 1;
        }

        // привязка к истории
        for (let id in itemCounts) {
            await client.query(
                'INSERT INTO contract_items (contract_id, item_id, quantity) VALUES ($1, $2, $3)',
                [contractId, id, itemCounts[id]]
            );
        }

        await client.query('COMMIT');

        res.json({
            contractId,
            totalCost,
            expectedProfit,
            resultFloat,
            message: 'расчет успешно выполнен'
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'ошибка при расчете контракта' });
    } finally {
        client.release(); // освобождаем клиента
    }
};

// получение истории контрактов для личного кабинета
const getContractHistory = async (req, res) => {
    try {
        const history = await pool.query(`
            SELECT c.*, i.market_name as result_item_name, i.image_url as result_item_image
            FROM contracts c
            LEFT JOIN items i ON c.result_item_id = i.id
            WHERE c.user_id = $1
            ORDER BY c.created_at DESC
        `, [req.user.id]);
        res.json(history.rows);
    } catch (err) {
        res.status(500).json({ error: 'ошибка при получении истории расчетов' });
    }
};

module.exports = { calculateContract, getContractHistory };