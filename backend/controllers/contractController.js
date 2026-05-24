const db = require('../db');

// вспомогательная функция для определения качества по износу
const getExteriorName = (floatVal) => {
  if (floatVal < 0.07) return 'прямо с завода';
  if (floatVal < 0.15) return 'немного поношенное';
  if (floatVal < 0.38) return 'после полевых испытаний';
  if (floatVal < 0.45) return 'поношенное';
  return 'закаленное в боях';
};

const calculateContract = async (req, res) => {
  let client;
  try {
    const { items } = req.body; // ожидаем массив [{ id: 5, float: 0.38 }, ...]

    if (!items || items.length !== 10) {
      return res.status(400).json({ error: 'Необходимо передать ровно 10 предметов' });
    }

    // получаем информацию о предметах из базы данных
    const itemIds = items.map(i => i.id);
    const { rows: dbItems } = await db.query(
      'SELECT * FROM items WHERE id = ANY($1)',
      [itemIds]
    );

    if (dbItems.length === 0) {
      return res.status(400).json({ error: 'Предметы не найдены в базе данных' });
    }

    // собираем карту предметов для быстрого доступа
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

    // определяем целевую редкость по первому предмету
    const firstItem = dbItemsMap[items[0].id];
    let targetRarity = '';
    if (firstItem.rarity === 'Запрещенное') targetRarity = 'Засекреченное';
    else if (firstItem.rarity === 'Засекреченное') targetRarity = 'Тайное';
    else {
      return res.status(400).json({ error: 'Из предметов данной редкости нельзя провести контракт' });
    }

    // ищем возможные исходы из базы данных
    const { rows: possibleOutputs } = await db.query(
      'SELECT * FROM items WHERE rarity = $1',
      [targetRarity]
    );

    if (possibleOutputs.length === 0) {
      return res.status(400).json({ error: 'Нет возможных исходов для данного контракта' });
    }

    // считаем математику для каждого возможного исхода по формуле
    const outcomes = possibleOutputs.map(output => {
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

    // агрегируем показатели для вывода
    const profits = outcomes.map(o => o.profit);
    const minProfit = Math.min(...profits);
    const maxProfit = Math.max(...profits);
    const averageProfit = profits.reduce((sum, p) => sum + p, 0) / outcomes.length;

    const positiveOutcomes = outcomes.filter(o => o.profit > 0);
    const successChance = (positiveOutcomes.length / outcomes.length) * 100;

    // подключаемся к пулу для выполнения транзакции записи контракта в историю
    client = await db.connect();
    await client.query('BEGIN');

    // вставляем запись контракта (результирующий предмет больше не записывается)
    const insertContractQuery = `
      INSERT INTO contracts (user_id, input_items_cost, expected_profit, result_float)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const { rows: contractRows } = await client.query(insertContractQuery, [
      req.user.id, // берется из middleware авторизации
      totalInputCost,
      Math.round(averageProfit),
      averageFloat
    ]);

    const contractId = contractRows[0].id;

    // сохраняем связи входных предметов с созданным контрактом
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

    // отдаем готовый расчет на фронтенд
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

// получение истории контрактов пользователя (простой запрос без join по результату)
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

module.exports = {
  calculateContract,
  getContractHistory
};