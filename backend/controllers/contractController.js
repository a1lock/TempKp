const db = require('../db');

// вспомогательная функция для определения качества по износу
const getExteriorName = (floatVal) => {
  if (floatVal < 0.07) return 'прямо с завода';
  if (floatVal < 0.15) return 'немного поношенное';
  if (floatVal < 0.38) return 'после полевых испытаний';
  if (floatVal < 0.45) return 'поношенное';
  return 'закаленное в боях';
};

// расчет и сохранение контракта
const calculateContract = async (req, res) => {
  let client;
  try {
    const { items } = req.body;

    if (!items || items.length !== 10) {
      return res.status(400).json({ error: 'Необходимо передать ровно 10 предметов' });
    }

    const itemIds = items.map(i => i.id);
    const { rows: dbItems } = await db.query(
      'SELECT * FROM items WHERE id = ANY($1)',
      [itemIds]
    );

    if (dbItems.length === 0) {
      return res.status(400).json({ error: 'Предметы не найдены в базе данных' });
    }

    const dbItemsMap = {};
    dbItems.forEach(item => {
      dbItemsMap[item.id] = item;
    });

    let totalInputCost = 0;
    let sumFloats = 0;

    for (const input of items) {
      const dbItem = dbItemsMap[input.id];
      if (!dbItem) {
        return res.status(400).json({ error: `Предмет с id ${input.id} не найден` });
      }
      totalInputCost += Number(dbItem.price);
      sumFloats += Number(input.float);
    }

    const averageFloat = sumFloats / 10;

    const firstItem = dbItemsMap[items[0].id];
    const allSameRarity = items.every(i => dbItemsMap[i.id]?.rarity === firstItem.rarity);
    if (!allSameRarity) {
      return res.status(400).json({ error: 'Все предметы контракта должны иметь одинаковую редкость' });
    }

    let targetRarity = '';
    if (firstItem.rarity === 'Запрещенное') targetRarity = 'Засекреченное';
    else if (firstItem.rarity === 'Засекреченное') targetRarity = 'Тайное';
    else {
      return res.status(400).json({ error: 'Из предметов данной редкости нельзя провести контракт' });
    }

    const { rows: possibleOutputs } = await db.query(
      'SELECT * FROM items WHERE rarity = $1',
      [targetRarity]
    );

    if (possibleOutputs.length === 0) {
      return res.status(400).json({ error: 'Нет возможных исходов для данного контракта' });
    }

    const getCollectionName = (marketName) => {
      if (/Ticket to Hell|Night Terror|Rapid Eye Movement|Abyssal Apparition|Starlight Protector/.test(marketName)) {
        return 'Dreams & Nightmares';
      }
      if (/\bSlate\b|Clear Polymer|Galil AR \| Chromatic Aberration|MP9 \| Food Chain|M4A4 \| In Living Color|USP-S \| The Traitor/.test(marketName)) {
        return 'Snakebite';
      }
      return null;
    };

    const getExteriorByFloat = (f) => {
      if (f < 0.15) return 'Factory New';
      if (f < 0.45) return 'Field-Tested';
      return 'Battle-Scarred';
    };

    const inputCollection = getCollectionName(firstItem.market_name);
    const expectedExterior = getExteriorByFloat(averageFloat);

    let filteredOutputs = possibleOutputs.filter((o) =>
      o.exterior === expectedExterior &&
      (inputCollection === null || getCollectionName(o.market_name) === inputCollection)
    );
    if (filteredOutputs.length === 0) filteredOutputs = possibleOutputs;

    const outcomes = filteredOutputs.map(output => {
      const minF = Number(output.min_float);
      const maxF = Number(output.max_float);
      const resultFloat = averageFloat * (maxF - minF) + minF;
      const profit = Number(output.price) - totalInputCost;

      return {
        id: output.id,
        market_name: output.market_name,
        result_float: resultFloat,
        profit: profit,
        price: Number(output.price)
      };
    });

    const profits = outcomes.map(o => o.profit);
    const minProfit = Math.min(...profits);
    const maxProfit = Math.max(...profits);
    const averageProfit = profits.reduce((sum, p) => sum + p, 0) / outcomes.length;

    const positiveOutcomes = outcomes.filter(o => o.profit > 0);
    const successChance = (positiveOutcomes.length / outcomes.length) * 100;

    client = await db.connect();
    await client.query('BEGIN');

    const insertContractQuery = `
      INSERT INTO contracts (user_id, input_items_cost, expected_profit, result_float)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const { rows: contractRows } = await client.query(insertContractQuery, [
      req.user.id,
      totalInputCost,
      Math.round(averageProfit),
      averageFloat
    ]);

    const contractId = contractRows[0].id;

    const insertItemQuery = `
      INSERT INTO contract_items (contract_id, item_id, quantity)
      VALUES ($1, $2, 1)
      ON CONFLICT (contract_id, item_id)
      DO UPDATE SET quantity = contract_items.quantity + 1
    `;

    for (const input of items) {
      await client.query(insertItemQuery, [contractId, input.id]);
    }

    await client.query('COMMIT');
    client.release();

    res.json({
      input_items_cost: totalInputCost,
      expected_profit: Math.round(averageProfit),
      min_profit: Math.round(minProfit),
      max_profit: Math.round(maxProfit),
      success_chance: Math.round(successChance),
      result_float: averageFloat,
      exterior_name: getExteriorName(averageFloat)
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    console.error(error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при расчете контракта' });
  }
};

// получение истории контрактов пользователя
const getContractHistory = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, input_items_cost, expected_profit, result_float, created_at FROM contracts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка получения истории контрактов' });
  }
};

// получение детальной информации о конкретном контракте по id
const getContractDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows: contractRows } = await db.query(
      'SELECT id, input_items_cost, expected_profit, result_float, created_at FROM contracts WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (contractRows.length === 0) {
      return res.status(404).json({ error: 'Контракт не найден' });
    }

    const contract = contractRows[0];

    // собираем список предметов, которые участвовали в этом контракте
    const { rows: inputItems } = await db.query(
      `SELECT i.*, ci.quantity 
       FROM contract_items ci
       JOIN items i ON ci.item_id = i.id
       WHERE ci.contract_id = $1`,
      [id]
    );

    res.json({
      ...contract,
      items: inputItems
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении деталей контракта' });
  }
};

module.exports = {
  calculateContract,
  getContractHistory,
  getContractDetails
};