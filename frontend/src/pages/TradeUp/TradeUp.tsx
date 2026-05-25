import React, { useState, useEffect } from "react";
import { api } from "../../api";
import type { Item } from "../../types";

interface HistoryItem {
  id: number;
  input_items_cost: string;
  expected_profit: string;
  result_float: number;
  result_name: string;
  created_at: string;
}

const TradeUp = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [slots, setSlots] = useState<(Item | null)[]>(Array(10).fill(null));
  // хранение индивидуального износа для каждой из 10 ячеек
  const [slotFloats, setSlotFloats] = useState<number[]>(Array(10).fill(0.15));
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [result, setResult] = useState<{
    input_items_cost: number;
    expected_profit: number;
    min_profit: number;
    max_profit: number;
    success_chance: number;
    result_float: number;
    exterior_name: string;
    outcomes?: { market_name: string; chance: number; profit: number }[];
  } | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // загружаем предметы каталога
    api
      .get("/items")
      .then((res) => {
        const filtered = res.data.filter(
          (item: Item) =>
            item.rarity === "Запрещенное" || item.rarity === "Засекреченное",
        );
        setItems(filtered);
      })
      .catch((err) => console.error("ошибка загрузки каталога:", err));

    // загружаем историю расчетов пользователя
    fetchHistory();
  }, []);

  const fetchHistory = () => {
    api
      .get("/contracts/history")
      .then((res) => setHistory(res.data))
      .catch((err) => console.error("ошибка загрузки истории:", err));
  };

  const handleAddItem = (item: Item) => {
    const emptyIndex = slots.findIndex((s) => s === null);
    if (emptyIndex !== -1) {
      const newSlots = [...slots];
      newSlots[emptyIndex] = item;
      setSlots(newSlots);

      // задаем начальный износ на основе параметров предмета
      const newFloats = [...slotFloats];
      newFloats[emptyIndex] =
        item.min_float !== undefined ? item.min_float : 0.15;
      setSlotFloats(newFloats);
    }
  };

  const handleRemoveItem = (index: number) => {
    const newSlots = [...slots];
    newSlots[index] = null;
    setSlots(newSlots);
  };

  const handleClear = () => {
    setSlots(Array(10).fill(null));
    setSlotFloats(Array(10).fill(0.15));
    setResult(null);
  };

  const handleCalculate = async () => {
    const activeSlots = slots.filter((s) => s !== null) as Item[];
    if (activeSlots.length < 10) {
      alert("заполните все 10 ячеек для проведения контракта");
      return;
    }

    // собираем предметы с их индивидуальными показателями износа
    const payload = {
      items: slots
        .map((slot, idx) => {
          if (!slot) return null;
          return {
            id: slot.id,
            float: slotFloats[idx],
          };
        })
        .filter((item): item is { id: number; float: number } => item !== null),
    };

    try {
      const res = await api.post("/contracts/calculate", payload);
      setResult(res.data);
      fetchHistory(); // обновляем список истории снизу
    } catch (error) {
      console.error("ошибка расчета:", error);
      alert("ошибка при расчете контракта");
    }
  };

  // загрузка деталей контракта из истории при клике с распаковкой дубликатов
  const handleLoadDetails = async (id: number) => {
    try {
      const res = await api.get(`/contracts/${id}`);
      const newSlots = Array(10).fill(null);
      const newFloats = Array(10).fill(0.15);
      let slotIndex = 0;

      // распаковываем предметы по ячейкам на основе их количества в контракте
      res.data.items.forEach((item: any) => {
        const qty = item.quantity || 1;
        for (let i = 0; i < qty; i++) {
          if (slotIndex < 10) {
            newSlots[slotIndex] = item;
            newFloats[slotIndex] =
              item.float_value !== undefined
                ? item.float_value
                : item.min_float || 0.15;
            slotIndex++;
          }
        }
      });

      setSlots(newSlots);
      setSlotFloats(newFloats);

      // выводим результаты для выбранного из истории контракта
      setResult({
        input_items_cost: Number(res.data.input_items_cost),
        expected_profit: Number(res.data.expected_profit),
        min_profit: 0,
        max_profit: 0,
        success_chance: 100,
        result_float: res.data.result_float,
        exterior_name: "по истории",
      });
    } catch (err) {
      alert("ошибка при загрузке деталей контракта");
    }
  };

  // расчет возможных исходов для отображения карточек в прогнозе
  const getPossibleOutcomes = () => {
    if (result && result.outcomes) {
      return result.outcomes;
    }

    const activeSlots = slots.filter((s) => s !== null) as Item[];
    if (activeSlots.length === 0 || !result) return [];

    // определяем уникальные коллекции входных предметов
    const collections = Array.from(
      new Set(
        activeSlots
          .map((s) => {
            if (
              s.market_name.includes("Ticket to Hell") ||
              s.market_name.includes("Night Terror")
            ) {
              return "Dreams & Nightmares";
            }
            if (
              s.market_name.includes("Slate") ||
              s.market_name.includes("Clear Polymer")
            ) {
              return "Snakebite";
            }
            return "";
          })
          .filter(Boolean),
      ),
    );

    if (collections.length === 0) return [];

    const inputRarity = activeSlots[0].rarity;
    let targetRarity = "Засекреченное";
    if (inputRarity === "Засекреченное") {
      targetRarity = "Тайное";
    }

    // сопоставляем рассчитанный float с доступными в базе качествами
    const getExteriorByFloat = (f: number): string => {
      if (f < 0.15) return "Factory New";
      if (f >= 0.15 && f < 0.45) return "Field-Tested";
      return "Battle-Scarred";
    };

    const expectedExterior = getExteriorByFloat(result.result_float);

    // фильтруем предметы по качеству, убирая дублирующиеся варианты износа
    const possibleTargets = items.filter(
      (i) =>
        i.rarity === targetRarity &&
        i.exterior === expectedExterior && // оставляем только ожидаемый износ
        collections.some((c) => {
          if (c === "Dreams & Nightmares")
            return (
              i.market_name.includes("Rapid Eye") ||
              i.market_name.includes("Abyssal") ||
              i.market_name.includes("Starlight")
            );
          if (c === "Snakebite")
            return (
              i.market_name.includes("Living Color") ||
              i.market_name.includes("Traitor") ||
              i.market_name.includes("Food Chain")
            );
          return false;
        }),
    );

    const totalInputCost = activeSlots.reduce(
      (sum, i) => sum + Number(i.price),
      0,
    );
    const chance = Math.round(100 / possibleTargets.length);

    return possibleTargets.map((t) => {
      const profit = Math.round(Number(t.price) - totalInputCost);
      return {
        market_name: t.market_name,
        chance: chance,
        profit: profit,
      };
    });
  };

  // фильтрация доступных предметов по названию
  const filteredItems = items.filter((item) =>
    item.market_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-[1440px] mx-auto p-6 text-white bg-[#0B0C10] min-h-[90vh]">
      <div className="mb-4 text-xs text-gray-500">
        Главная / Калькулятор контрактов
      </div>

      <h2 className="text-2xl font-bold mb-6">
        Калькулятор контрактов (Trade-up)
      </h2>

      {/* сетка слотов */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        {slots.map((slot, idx) => (
          <div
            key={idx}
            className="bg-[#1A1B23] border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-between text-center min-h-[160px]"
          >
            {slot ? (
              <>
                <span className="text-xs font-semibold">
                  {slot.market_name}
                </span>

                {/* интерактивное поле изменения износа для каждого предмета */}
                <div className="w-full my-2">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="1"
                    value={slotFloats[idx]}
                    onChange={(e) => {
                      const newFloats = [...slotFloats];
                      newFloats[idx] = parseFloat(e.target.value) || 0;
                      setSlotFloats(newFloats);
                    }}
                    className="w-full bg-[#0F1014] text-white text-center text-xs p-1 rounded border border-gray-700 outline-none"
                  />
                </div>

                <button
                  onClick={() => handleRemoveItem(idx)}
                  className="text-red-500 text-xs mt-auto hover:underline"
                >
                  убрать
                </button>
              </>
            ) : (
              <span className="text-gray-600 text-3xl my-auto font-light">
                +
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="text-center mb-6">
        <span className="text-xs text-gray-500 block mb-1">
          Заполнено ячеек:
        </span>
        <span className="bg-black px-3 py-1 rounded text-xs font-bold text-[#FF9408]">
          {slots.filter((s) => s !== null).length} / 10
        </span>
      </div>

      <div className="flex gap-4 mb-8">
        <button
          onClick={handleCalculate}
          className="bg-[#FF9408] text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-orange-600 transition"
        >
          Рассчитать контракт
        </button>
        <button
          onClick={handleClear}
          className="bg-[#1A1B23] text-gray-300 px-6 py-3 rounded-lg font-bold text-sm hover:bg-gray-800 border border-gray-800 transition"
        >
          Очистить ячейки
        </button>
      </div>

      {/* результаты расчета */}
      {result && (
        <div className="bg-[#1A1B23] border border-gray-800 rounded-xl p-6 mb-8">
          <h3 className="bg-[#2D2E37] px-4 py-2 text-xs font-bold w-fit rounded mb-6">
            Прогноз контракта
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div>
              <span className="text-xs text-gray-400 block mb-1">
                Шанс исхода
              </span>
              <span className="text-2xl font-extrabold">
                {result.success_chance}%
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">
                Ожидаемая прибыль
              </span>
              <span
                className={`text-2xl font-extrabold ${result.expected_profit >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {result.expected_profit >= 0 ? "+" : ""}
                {result.expected_profit} ₽
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">
                Прогноз Float
              </span>
              <span className="text-2xl font-extrabold">
                {result.result_float.toFixed(3)}
              </span>
              <span className="text-xs text-gray-500 block mt-1">
                (по расчетам)
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">
                Сумма входа
              </span>
              <span className="text-2xl font-extrabold text-white">
                {result.input_items_cost} ₽
              </span>
            </div>
          </div>

          {/* карточки возможных результатов контракта */}
          <div className="border-t border-gray-800 pt-6">
            <h4 className="text-xs text-gray-400 uppercase font-bold mb-4">
              Возможные исходы контракта:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getPossibleOutcomes().map((outcome: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-[#0F1014] p-4 rounded-lg border border-gray-800 flex flex-col justify-between"
                >
                  <span className="text-xs font-bold text-white truncate">
                    {outcome.market_name}
                  </span>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[10px] text-[#FF9408]">
                      Шанс: {outcome.chance}%
                    </span>
                    <span
                      className={`text-xs font-bold ${outcome.profit >= 0 ? "text-green-500" : "text-red-500"}`}
                    >
                      {outcome.profit >= 0 ? "+" : ""}
                      {outcome.profit} ₽
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1A1B23] border border-gray-800 rounded-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-sm font-bold text-[#FF9408]">
            Доступные предметы для контракта
          </h3>

          {/* поле поиска предметов */}
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#0F1014] text-white text-xs p-2 rounded border border-gray-700 outline-none w-full md:w-64"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto pr-2">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleAddItem(item)}
              className="bg-[#0F1014] hover:bg-[#1C1D24] border border-gray-800 text-left p-4 rounded-lg flex flex-col justify-between transition"
            >
              <span className="text-xs font-bold text-white mb-2">
                {item.market_name}
              </span>
              <span className="text-xs text-[#FF9408] font-bold">
                {Number(item.price)} ₽
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* история проведенных расчетов */}
      <div className="bg-[#1A1B23] border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-bold text-white mb-4">
          История проведенных расчетов
        </h3>
        <div className="flex flex-col gap-4">
          {history.map((h) => (
            <div
              key={h.id}
              onClick={() => handleLoadDetails(h.id)}
              className="bg-[#0F1014] border border-gray-800 hover:border-[#FF9408] p-4 rounded-lg flex justify-between items-center cursor-pointer transition"
            >
              <div>
                <span className="text-[10px] text-gray-500 block mb-1">
                  {new Date(h.created_at).toLocaleDateString()}
                </span>
                <span className="text-sm font-bold block text-white">
                  Ожидаемый профит:{" "}
                  <span
                    className={
                      Number(h.expected_profit) >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {Number(h.expected_profit) >= 0 ? "+" : ""}
                    {Number(h.expected_profit)} ₽
                  </span>
                </span>
                <span className="text-xs text-gray-400">
                  Флоат: {Number(h.result_float).toFixed(4)}
                </span>
              </div>
              <span className="text-[#FF9408] font-bold">
                {Number(h.input_items_cost)} ₽
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TradeUp;
