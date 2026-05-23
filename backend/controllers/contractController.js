const pool = require('../db');

// расчет контракта
const calculateContract = async (req, res) => {
    const { itemIds, inputFloats } = req.body; 
    // itemIds - массив из 10 id предметов, inputFloats - массив из 10 введенных флоатов

    if (!itemIds || itemIds.length !== 10 || !inputFloats || inputFloats.length !== 10) {
        return res.status(400).json({ error: 'контракт требует ровно 10 предметов и их показателей износа' });
    }

    try {
        // получаем цены входных предметов для расчета суммы входа
        let totalCost = 0;
        for (let id of itemIds) {
            const item = await pool.query('SELECT price FROM items WHERE id = $1', [id]);
            if (item.rows.length > 0) totalCost += parseFloat(item.rows[0].price);
        }

        // считаем средний флоат входа
        const avgFloat = inputFloats.reduce((acc, val) => acc + val, 0) / 10;

        // заглушка: берем случайные лимиты целевого предмета (в реальном проекте ищем цель в бд по редкости)
        const targetMinFloat = 0.00;
        const targetMaxFloat = 1.00;
        const targetPrice = 5000.00; // условная цена результата

        // формула расчета итогового износа
        const resultFloat = (avgFloat * (targetMaxFloat - targetMinFloat)) + targetMinFloat;
        const expectedProfit = targetPrice - totalCost;

        // сохраняем результат в историю контрактов
        const contract = await pool.query(
            'INSERT INTO contracts (user_id, input_items_cost, expected_profit, result_float) VALUES ($1, $2, $3, $4) RETURNING id',
            [req.user.id, totalCost, expectedProfit, resultFloat]
        );

        res.json({
            contractId: contract.rows[0].id,
            totalCost,
            expectedProfit,
            resultFloat,
            message: 'расчет успешно выполнен'
        });
    } catch (err) {
        res.status(500).json({ error: 'ошибка при расчете контракта' });
    }
};

module.exports = { calculateContract };