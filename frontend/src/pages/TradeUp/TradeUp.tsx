import { useState, useEffect } from "react";
import { api } from "../../api";
import type { Item } from "../../types";

interface HistoryItem {
  id: number;
  input_items_cost: string;
  expected_profit: string;
  result_float: number;
  created_at: string;
}

// середина диапазона float для каждого качества подставляется по умолчанию при добавлении предмета в слот
const EXTERIOR_MID_FLOAT: Record<string, number> = {
  "Factory New": 0.035,
  "Minimal Wear": 0.110,
  "Field-Tested": 0.265,
  "Well-Worn": 0.415,
  "Battle-Scarred": 0.725,
};

// только предметы из этих двух коллекций участвуют в контрактах на нашем сайте
const CONTRACT_INPUT_KEYWORDS = [
  "Ticket to Hell", "Night Terror",
  "Rapid Eye Movement", "Abyssal Apparition",
  "Slate", "Clear Polymer",
  "Chromatic Aberration", "Food Chain",
];

interface ModalContract {
  input_items_cost: number;
  expected_profit: number;
  result_float: number;
  items: Array<{ market_name: string; exterior: string; quantity: number }>;
}

const TradeUp = () => {
  const [items, setItems] = useState<Item[]>([]);
  // 10 слотов для предметов и параллельный массив float-значений для каждого слота
  const [slots, setSlots] = useState<(Item | null)[]>(Array(10).fill(null));
  const [slotFloats, setSlotFloats] = useState<number[]>(Array(10).fill(0.15));
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [modalContract, setModalContract] = useState<ModalContract | null>(null);
  const [result, setResult] = useState<{
    input_items_cost: number;
    expected_profit: number;
    min_profit: number;
    max_profit: number;
    success_chance: number;
    result_float: number;
    exterior_name: string;
    outcomes?: { market_name: string; price: number; chance: number; profit: number }[];
  } | null>(null);
  const [search, setSearch] = useState("");

  const fetchHistory = () => {
    api
      .get("/contracts/history")
      .then((res) => setHistory(res.data))
      .catch((err) => console.error("ошибка загрузки истории:", err));
  };

  useEffect(() => {
    api
      .get("/items")
      .then((res) => setItems(res.data))
      .catch((err) => console.error("ошибка загрузки каталога:", err));

    fetchHistory();
  }, []);

  const handleAddItem = (item: Item) => {
    const emptyIndex = slots.findIndex((s) => s === null);
    if (emptyIndex !== -1) {
      const newSlots = [...slots];
      newSlots[emptyIndex] = item;
      setSlots(newSlots);

      const newFloats = [...slotFloats];
      newFloats[emptyIndex] = EXTERIOR_MID_FLOAT[item.exterior] ?? 0.15;
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

  // клик по записи в истории открывает модалку с деталями вместо загрузки в слоты
  const handleLoadDetails = async (id: number) => {
    try {
      const res = await api.get(`/contracts/${id}`);
      setModalContract({
        input_items_cost: Number(res.data.input_items_cost),
        expected_profit: Number(res.data.expected_profit),
        result_float: Number(res.data.result_float),
        items: res.data.items.map((item: { market_name: string; exterior: string; quantity?: number }) => ({
          market_name: item.market_name,
          exterior: item.exterior,
          quantity: item.quantity || 1,
        })),
      });
    } catch {
      alert("ошибка при загрузке деталей контракта");
    }
  };

  // строит список карточек исходов на основе предметов в слотах и результата расчёта.
  // считается на фронте, а не берётся с бэка чтобы шанс и EV совпадали с тем, что видит пользователь
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
              s.market_name.includes("Night Terror") ||
              s.market_name.includes("Rapid Eye Movement") ||
              s.market_name.includes("Abyssal Apparition")
            ) {
              return "Dreams & Nightmares";
            }
            if (
              s.market_name.includes("Slate") ||
              s.market_name.includes("Clear Polymer") ||
              s.market_name.includes("Chromatic Aberration") ||
              s.market_name.includes("Food Chain")
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
              i.market_name.includes("FAMAS | Rapid Eye Movement") ||
              i.market_name.includes("MP7 | Abyssal Apparition") ||
              i.market_name.includes("MP9 | Starlight Protector")
            );
          if (c === "Snakebite")
            return (
              i.market_name.includes("Galil AR | Chromatic Aberration") ||
              i.market_name.includes("MP9 | Food Chain") ||
              i.market_name.includes("M4A4 | In Living Color") ||
              i.market_name.includes("USP-S | The Traitor")
            );
          return false;
        }),
    );

    const totalInputCost = activeSlots.reduce(
      (sum, i) => sum + Number(i.price),
      0,
    );
    // точная дробная вероятность округляется только при отображении, чтобы EV был точным
    const exactChance = 100 / possibleTargets.length;

    return possibleTargets.map((t) => ({
      market_name: t.market_name,
      price: Math.round(Number(t.price)),
      profit: Math.round(Number(t.price) - totalInputCost),
      chance: exactChance,
    }));
  };

  const filteredItems = items.filter(
    (item) =>
      (item.rarity === "Запрещенное" || item.rarity === "Засекреченное") &&
      CONTRACT_INPUT_KEYWORDS.some((k) => item.market_name.includes(k)) &&
      item.market_name.toLowerCase().includes(search.toLowerCase()),
  );

  const displayedOutcomes = getPossibleOutcomes();
  // EV = сумма (вероятность * прибыль) по всем исходам
  const expectedProfit = displayedOutcomes.length > 0
    ? Math.round(displayedOutcomes.reduce((sum, o) => sum + (o.chance / 100) * o.profit, 0))
    : result?.expected_profit ?? 0;
  // шанс успеха = доля исходов, где прибыль > 0
  const successChance = displayedOutcomes.length > 0
    ? Math.round((displayedOutcomes.filter(o => o.profit > 0).length / displayedOutcomes.length) * 100)
    : result?.success_chance ?? 0;

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

      <div className="flex flex-wrap gap-4 mb-8">
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
                {successChance}%
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">
                Ожидаемая прибыль
              </span>
              <span
                className={`text-2xl font-extrabold ${expectedProfit >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {expectedProfit >= 0 ? "+" : ""}
                {expectedProfit} ₽
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
              {displayedOutcomes.map((outcome, idx: number) => (
                <div
                  key={idx}
                  className="bg-[#0F1014] p-4 rounded-lg border border-gray-800 flex flex-col justify-between"
                >
                  <span className="text-xs font-bold text-white truncate">
                    {outcome.market_name}
                  </span>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[10px] text-[#FF9408]">
                      Шанс: {Math.round(outcome.chance)}%
                    </span>
                    <span className="text-xs font-bold text-white">
                      {outcome.price} ₽
                    </span>
                  </div>
                  <div className="flex justify-end mt-1">
                    <span
                      className={`text-[10px] ${outcome.profit >= 0 ? "text-green-500" : "text-red-500"}`}
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

      {/* модальное окно деталей контракта из истории */}
      {modalContract && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setModalContract(null)}
        >
          <div
            className="bg-[#1A1B23] border border-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-white">Детали контракта</h3>
              <button
                onClick={() => setModalContract(null)}
                className="text-gray-500 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#0F1014] rounded-lg p-4 mb-6">
              <h4 className="text-xs font-bold text-[#FF9408] mb-4">Прогноз контракта</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-xs text-gray-400 block mb-1">Ожидаемая прибыль</span>
                  <span className={`text-lg font-extrabold ${modalContract.expected_profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {modalContract.expected_profit >= 0 ? "+" : ""}
                    {modalContract.expected_profit} ₽
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block mb-1">Прогноз Float</span>
                  <span className="text-lg font-extrabold">
                    {modalContract.result_float.toFixed(3)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block mb-1">Сумма входа</span>
                  <span className="text-lg font-extrabold text-white">
                    {modalContract.input_items_cost} ₽
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs text-gray-400 uppercase font-bold mb-3">Предметы контракта</h4>
              <div className="flex flex-col gap-2">
                {modalContract.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#0F1014] border border-gray-800 rounded-lg px-4 py-3 flex justify-between items-center"
                  >
                    <span className="text-xs font-bold text-white truncate min-w-0 flex-1">{item.market_name}</span>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-xs text-gray-400">{item.exterior}</span>
                      <span className="text-xs font-bold text-[#FF9408]">× {item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
