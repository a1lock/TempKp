const pool = require('../db');

// расчет контракта
const calculateContract = async (req, res) => {
    const { itemIds, inputFloats } = req.body; 
    // itemIds - массив из 10 id предметов, inputFloats - массив из 10 введенных флоатов

    if (!itemIds || itemIds.length !== 10 || !inputFloats || inputFloats.length !== 10) {
        return res.status(400).json({ error: 'контракт требует ровно 10 предметов и их показателей износа' });
    }

    try {
        await pool.query('BEGIN'); // начало транзакции

        // получаем цены входных предметов для расчета суммы входа
        let totalCost = 0;
        for (let id of itemIds) {
            const item = await pool.query('SELECT price FROM items WHERE id = $1', [id]);
            if (item.rows.length > 0) totalCost += parseFloat(item.rows[0].price);
        }

        // считаем средний флоат входа
        const avgFloat = inputFloats.reduce((acc, val) => acc + val, 0) / 10;

        // условные лимиты целевого предмета
        const targetMinFloat = 0.00;
        const targetMaxFloat = 1.00;
        const targetPrice = 5000.00; 

        // формула расчета итогового износа
        const resultFloat = (avgFloat * (targetMaxFloat - targetMinFloat)) + targetMinFloat;
        const expectedProfit = targetPrice - totalCost;

        // сохраняем результат в историю контрактов
        const contract = await pool.query(
            'INSERT INTO contracts (user_id, input_items_cost, expected_profit, result_float) VALUES ($1, $2, $3, $4) RETURNING id',
            [req.user.id, totalCost, expectedProfit, resultFloat]
        );
        const contractId = contract.rows[0].id;

        // группируем дубликаты предметов для использования поля quantity
        const itemCounts = {};
        for (let id of itemIds) {
            itemCounts[id] = (itemCounts[id] || 0) + 1;
        }

        // привязка предметов к контракту в бд
        for (let id in itemCounts) {
            await pool.query(
                'INSERT INTO contract_items (contract_id, item_id, quantity) VALUES ($1, $2, $3)',
                [contractId, id, itemCounts[id]]
            );
        }

        await pool.query('COMMIT'); // подтверждение транзакции

        res.json({
            contractId,
            totalCost,
            expectedProfit,
            resultFloat,
            message: 'расчет успешно выполнен'
        });
    } catch (err) {
        await pool.query('ROLLBACK'); // откат транзакции при ошибке
        res.status(500).json({ error: 'ошибка при расчете контракта' });
    }
};

module.exports = { calculateContract };