import { useState, useEffect } from 'react';
import { api } from '../../api';
import type { Item, PredictionResult, ContractHistory } from '../../types';
import { Search } from 'lucide-react';

// список разрешенных предметов для тестирования
const allowedWeapons = [
  'USP-S | Ticket to Hell',
  'M4A1-S | Night Terror',
  'FAMAS | Rapid Eye Movement',
  'MP7 | Abyssal Apparition',
  'AK-47 | Slate',
  'Glock-18 | Clear Polymer',
  'Galil AR | Chromatic Aberration',
  'MP9 | Food Chain'
];

const getBaseName = (fullName: string): string => {
  return fullName.split(' (')[0];
};

const getCollection = (marketName: string): string => {
  const lower = marketName.toLowerCase();
  if (lower.includes('ticket to hell') || lower.includes('night terror') || lower.includes('rapid eye') || lower.includes('abyssal') || lower.includes('starlight')) {
    return 'dreams';
  }
  return 'snakebite';
};

const getExteriorFromFloat = (f: number): string => {
  if (f < 0.07) return 'Factory New';
  if (f < 0.15) return 'Minimal Wear';
  if (f < 0.38) return 'Field-Tested';
  if (f < 0.45) return 'Well-Worn';
  return 'Battle-Scarred';
};

// получение цвета верхней полоски на основе официальной редкости cs2
const getRarityColor = (rarity: string): string => {
  switch (rarity) {
    case 'Запрещенное':
      return '#8847ff'; // фиолетовый
    case 'Засекреченное':
      return '#d32ce6'; // розовый
    case 'Тайное':
      return '#eb4b4b'; // красный
    case 'Экстраординарное':
      return '#e4ae39'; // золотой
    default:
      return '#4b69ff'; // армейское (синий)
  }
};

const getClosestAvailableItem = (templates: Item[], baseName: string, targetExterior: string): Item | undefined => {
  const sameBaseItems = templates.filter(t => getBaseName(t.market_name) === baseName);
  if (sameBaseItems.length === 0) return undefined;
  
  const exact = sameBaseItems.find(t => t.exterior === targetExterior);
  if (exact) return exact;
  
  const order = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
  const targetIdx = order.indexOf(targetExterior);
  
  let closestItem = sameBaseItems[0];
  let minDiff = 100;
  
  sameBaseItems.forEach(item => {
    const idx = order.indexOf(item.exterior);
    const diff = Math.abs(idx - targetIdx);
    if (diff < minDiff) {
      minDiff = diff;
      closestItem = item;
    }
  });
  
  return closestItem;
};

const TradeUp = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [slots, setSlots] = useState<(Item | null)[]>(Array(10).fill(null));
  // состояние для хранения ручного износа каждого слота
  const [slotFloats, setSlotFloats] = useState<number[]>(Array(10).fill(0));
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState<ContractHistory[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const [activeHistory, setActiveHistory] = useState<ContractHistory | null>(null);
  const [historyInputs, setHistoryInputs] = useState<Item[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/contracts/history');
      setHistory(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    api.get('/items').then(res => setItems(res.data)).catch(console.error);
    fetchHistory();
  }, []);

  const handleAddItem = (item: Item) => {
    const emptyIdx = slots.findIndex(s => s === null);
    if (emptyIdx !== -1) {
      const copy = [...slots];
      copy[emptyIdx] = item;
      setSlots(copy);

      // устанавливаем средний износ по умолчанию для нового предмета в слоте
      const avgFloat = (item.min_float + item.max_float) / 2;
      const copyFloats = [...slotFloats];
      copyFloats[emptyIdx] = Number(avgFloat.toFixed(4));
      setSlotFloats(copyFloats);
      
      // скрываем прошлые результаты при изменении состава слотов
      setShowResults(false);
    } else {
      alert('все 10 слотов уже заполнены');
    }
  };

  const handleFloatChange = (idx: number, val: number) => {
    const copyFloats = [...slotFloats];
    copyFloats[idx] = val;
    setSlotFloats(copyFloats);
    setShowResults(false);
  };

  const clearSlots = () => {
    setSlots(Array(10).fill(null));
    setSlotFloats(Array(10).fill(0));
    setShowResults(false);
  };

  const filledItems = slots.filter((s): s is Item => s !== null);
  const filledCount = filledItems.length;

  // динамический расчет исходов контракта
  const outcomes = (() => {
    if (filledCount !== 10) return [];

    // считаем средний износ на основе введенных пользователем ручных float
    const averageInputFloat = slots.reduce((sum, item, idx) => {
      if (!item) return sum;
      return sum + slotFloats[idx];
    }, 0) / 10;

    const inputCost = filledItems.reduce((sum, i) => sum + Number(i.price), 0);

    const collectionCounts: Record<string, number> = {};
    filledItems.forEach(item => {
      const col = getCollection(item.market_name);
      collectionCounts[col] = (collectionCounts[col] || 0) + 1;
    });

    const inputRarity = filledItems[0].rarity;
    const targetRarity = inputRarity === 'Запрещенное' ? 'Засекреченное' : 'Тайное';

    const targetTemplates = items.filter(i => i.rarity === targetRarity);
    const uniqueBaseNames = Array.from(new Set(targetTemplates.map(t => getBaseName(t.market_name))));

    const possibleOutcomes: PredictionResult[] = [];

    uniqueBaseNames.forEach(baseName => {
      const template = targetTemplates.find(t => getBaseName(t.market_name) === baseName);
      if (!template) return;

      const col = getCollection(baseName);
      const colCount = collectionCounts[col] || 0;

      if (colCount > 0) {
        const resultFloat = averageInputFloat * (template.max_float - template.min_float) + template.min_float;
        const targetExterior = getExteriorFromFloat(resultFloat);

        const exactTargetItem = getClosestAvailableItem(targetTemplates, baseName, targetExterior);

        if (exactTargetItem) {
          const outcomesInCollection = uniqueBaseNames.filter(name => getCollection(name) === col).length;
          const probability = (colCount / 10) * (100 / outcomesInCollection);
          const profit = Number(exactTargetItem.price) - inputCost;

          possibleOutcomes.push({
            item: exactTargetItem,
            probability,
            result_float: resultFloat,
            profit
          });
        }
      }
    });

    return possibleOutcomes;
  })();

  const handleCalculateAndSave = async () => {
    if (filledCount !== 10) return alert('добавьте 10 предметов');
    if (outcomes.length === 0) return alert('не удалось вычислить исходы');

    const targetItemId = outcomes[0].item.id;
    const inputIds = filledItems.map(s => s.id);
    const activeFloats = slotFloats.filter((_, idx) => slots[idx] !== null);

    // формируем универсальный payload для защиты от ошибок 400 на бэкенде
    const payload = {
      inputItemIds: inputIds,
      itemIds: inputIds,
      floats: activeFloats,
      inputItemFloats: activeFloats,
      targetItemId: targetItemId,
      targetId: targetItemId,
      resultItemId: targetItemId,
      items: filledItems.map((item, idx) => ({
        id: item.id,
        float: slotFloats[slots.indexOf(item)]
      }))
    };

    try {
      await api.post('/contracts/calculate', payload);
      alert('расчет успешно сохранен в историю');
      setShowResults(true);
      fetchHistory();
    } catch (e) {
      alert('ошибка при сохранении расчета');
    }
  };

  const handleHistoryClick = async (con: ContractHistory) => {
    try {
      const res = await api.get(`/contracts/${con.id}/inputs`);
      setHistoryInputs(res.data || []);
      setActiveHistory(con);
      setIsModalOpen(true);
    } catch (e) {
      alert('ошибка при загрузке деталей контракта');
    }
  };

  // находим первый непустой предмет для определения редкости
  const firstSelectedItem = slots.find(s => s !== null);

  const filteredCatalogItems = items.filter(item => {
    const matchesSearch = item.market_name.toLowerCase().includes(search.toLowerCase());
    
    // фильтр по разрешенным предметам
    const isAllowed = allowedWeapons.some(allowed => item.market_name.includes(allowed));
    
    // если есть первый предмет, показываем только предметы той же редкости
    if (firstSelectedItem) {
      return matchesSearch && isAllowed && item.rarity === firstSelectedItem.rarity;
    }

    return matchesSearch && isAllowed;
  });

  return (
    <div className="max-w-[1440px] mx-auto p-6 flex flex-col min-h-screen justify-between relative">
      <div>
        <div className="text-gray-500 text-xs mb-4">Главная / Калькулятор контрактов</div>
        <h2 className="text-white text-2xl font-bold mb-6">Калькулятор контрактов (Trade-up)</h2>

        {/* сетка слотов */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          {slots.map((slot, idx) => (
            <div key={idx} className="h-36 bg-[#1A1B23] border border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center p-2 text-center relative overflow-hidden">
              {slot ? (
                <>
                  {/* полоса редкости сверху карточки */}
                  <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: getRarityColor(slot.rarity) }} />
                  <span className="text-white text-xs line-clamp-1 mt-2">{slot.market_name}</span>
                  
                  {/* мини-поле ввода износа */}
                  <input 
                    type="number"
                    step="0.0001"
                    min={slot.min_float}
                    max={slot.max_float}
                    value={slotFloats[idx] || 0}
                    onChange={e => handleFloatChange(idx, Number(e.target.value))}
                    className="w-20 bg-[#0F1014] text-[#FF9408] text-[10px] text-center rounded border border-gray-800 mt-2 p-0.5 outline-none"
                    title={`Допустимый износ: ${slot.min_float} - ${slot.max_float}`}
                  />

                  <button 
                    onClick={() => {
                      const copy = [...slots];
                      copy[idx] = null;
                      setSlots(copy);
                      setShowResults(false);
                    }} 
                    className="text-red-500 text-[10px] mt-1"
                  >
                    убрать
                  </button>
                </>
              ) : (
                <>
                  <span className="text-gray-500 text-xl mb-1">+</span>
                  <span className="text-gray-500 text-xs">слот {idx + 1}</span>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mb-8">
          <span className="text-gray-400 text-xs block mb-2">Заполнено ячеек:</span>
          <span className="bg-black text-white px-6 py-2 rounded font-bold text-sm">
            {filledCount} / 10
          </span>
        </div>

        {/* кнопки управления контрактом */}
        <div className="flex gap-4 mb-8 bg-[#1A1B23] p-4 rounded-xl border border-gray-800">
          <button 
            onClick={handleCalculateAndSave} 
            disabled={filledCount !== 10}
            className={`px-8 py-3 rounded-lg font-bold text-sm transition ${filledCount === 10 ? 'bg-[#FF9408] text-white hover:bg-orange-600' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
          >
            Рассчитать контракт
          </button>
          <button onClick={clearSlots} className="bg-gray-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition text-sm">
            Очистить ячейки
          </button>
        </div>

        {/* результаты отображаются только после нажатия кнопки */}
        {showResults && outcomes.length > 0 && (
          <section className="bg-[#1A1B23] p-6 rounded-xl border border-gray-800 text-white mb-8">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-6">Прогноз исходов контракта</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {outcomes.map((out, idx) => (
                <div key={idx} className="bg-[#0F1014] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white">{out.item.market_name}</h4>
                    <p className="text-xs text-gray-500 mt-1">Ожидаемый износ: {out.result_float.toFixed(4)}</p>
                    <p className={`text-sm font-bold mt-2 ${out.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {out.profit > 0 ? '+' : ''}{out.profit} ₽
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block mb-1">Шанс выпадения</span>
                    <span className="text-2xl font-extrabold text-[#FF9408]">{out.probability.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* каталог доступных предметов */}
        <section className="mt-8 bg-[#1A1B23] p-6 rounded-xl border border-gray-800 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-white font-bold">Доступные предметы для контракта</h3>
              {firstSelectedItem && (
                <span className="text-[#FF9408] text-xs">Показаны предметы редкости: {firstSelectedItem.rarity}</span>
              )}
            </div>
            <div className="relative w-full md:w-80">
              <input 
                type="text" 
                placeholder="Поиск по названию..." 
                className="w-full bg-[#0F1014] text-white p-2 pl-8 rounded border border-gray-700 outline-none text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Search className="absolute left-2 top-2.5 text-gray-500" size={16} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-2">
            {filteredCatalogItems.map(item => (
              <button 
                key={item.id} 
                onClick={() => handleAddItem(item)} 
                className="bg-[#0F1014] hover:bg-gray-800 text-white text-xs p-3 rounded-lg border border-gray-700 text-left transition"
              >
                <span className="block font-bold mb-1 truncate">{item.market_name}</span>
                <span className="text-[#FF9408]">{Number(item.price)} ₽</span>
              </button>
            ))}
          </div>
        </section>

        {/* история расчетов */}
        <section className="bg-[#1A1B23] p-6 rounded-xl border border-gray-800">
          <h3 className="text-white font-bold text-lg mb-6">История проведенных расчетов</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map(con => (
              <div 
                key={con.id} 
                onClick={() => handleHistoryClick(con)}
                className="bg-[#13141A] p-4 rounded-lg border border-gray-800 flex justify-between items-center cursor-pointer hover:border-gray-500 transition"
              >
                <div>
                  <span className="text-gray-500 text-xs">{new Date(con.created_at).toLocaleDateString()}</span>
                  <h4 className="text-white font-bold text-sm mt-1">Результат: {con.market_name || 'Неизвестно'}</h4>
                  <p className="text-gray-400 text-xs">Вычисленный Float: {Number(con.result_float).toFixed(4)}</p>
                </div>
                <span className="text-[#FF9408] font-bold text-sm">{con.input_items_cost} ₽</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* модальное окно деталей истории */}
      {isModalOpen && activeHistory && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1B23] w-full max-w-2xl rounded-xl p-6 border border-gray-800 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-bold text-lg">Детали контракта #{activeHistory.id}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2">
              <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Входные предметы (10 шт.)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                {historyInputs.map((item, idx) => (
                  <div key={idx} className="bg-[#0F1014] p-3 rounded-lg border border-gray-800 text-sm text-white">
                    {item.market_name}
                  </div>
                ))}
              </div>

              <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Параметры агрегации</h4>
              <div className="bg-[#0F1014] p-4 rounded-lg border border-gray-800 text-sm text-gray-300 flex justify-between">
                <span>Прогноз Float: <strong>{Number(activeHistory.result_float).toFixed(4)}</strong></span>
                <span>Сумма входа: <strong>{activeHistory.input_items_cost} ₽</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="flex justify-between items-center py-6 border-t border-gray-800 text-gray-500 text-xs mt-12">
        <span>SteamS&C</span>
        <span>disclaimer - API source - © 2026</span>
      </footer>
    </div>
  );
};

export default TradeUp;