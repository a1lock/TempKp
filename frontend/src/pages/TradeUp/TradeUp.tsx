import { useState, useEffect } from 'react';
import { api } from '../../api';
import type { Item, PredictionResult } from '../../types';
import { Search } from 'lucide-react';

// вспомогательный парсинг базового имени для удаления суффикса износа
const getBaseName = (fullName: string): string => {
  return fullName.split(' (')[0];
};

// сопоставление предметов с коллекциями на основе имени
const getCollection = (marketName: string): string => {
  const lower = marketName.toLowerCase();
  if (lower.includes('ticket to hell') || lower.includes('night terror') || lower.includes('rapid eye') || lower.includes('abyssal') || lower.includes('starlight') || lower.includes('nightwish')) {
    return 'dreams';
  }
  return 'snakebite';
};

// расчет качества (exterior) на основе вычисленного износа
const getExteriorFromFloat = (f: number): string => {
  if (f < 0.07) return 'Factory New';
  if (f < 0.15) return 'Minimal Wear';
  if (f < 0.38) return 'Field-Tested';
  if (f < 0.45) return 'Well-Worn';
  return 'Battle-Scarred';
};

const TradeUp = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [slots, setSlots] = useState<(Item | null)[]>(Array(10).fill(null));
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/items').then(res => setItems(res.data)).catch(console.error);
  }, []);

  const handleAddItem = (item: Item) => {
    const emptyIdx = slots.findIndex(s => s === null);
    if (emptyIdx !== -1) {
      const copy = [...slots];
      copy[emptyIdx] = item;
      setSlots(copy);
    } else {
      alert('все 10 слотов уже заполнены');
    }
  };

  const clearSlots = () => {
    setSlots(Array(10).fill(null));
  };

  const filledItems = slots.filter((s): s is Item => s !== null);
  const filledCount = filledItems.length;

  // динамическое вычисление исходов во время рендеринга ( derived state )
  // это убирает предупреждения eslint о вызове setState в эффекте и исправляет сумму вероятностей
  const outcomes = (() => {
    if (filledCount !== 10) return [];

    const averageInputFloat = filledItems.reduce((sum, i) => sum + ((i.min_float + i.max_float) / 2), 0) / 10;
    const inputCost = filledItems.reduce((sum, i) => sum + Number(i.price), 0);

    // группировка входных предметов по коллекциям
    const collectionCounts: Record<string, number> = {};
    filledItems.forEach(item => {
      const col = getCollection(item.market_name);
      collectionCounts[col] = (collectionCounts[col] || 0) + 1;
    });

    // определяем целевую редкость (на уровень выше)
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
        // вычисление износа по формуле
        const resultFloat = averageInputFloat * (template.max_float - template.min_float) + template.min_float;
        const targetExterior = getExteriorFromFloat(resultFloat);

        // ищем конкретный предмет в бд под вычисленный износ
        const exactTargetItem = targetTemplates.find(t => 
          getBaseName(t.market_name) === baseName && 
          t.exterior === targetExterior
        );

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

  const filteredCatalogItems = items.filter(item => 
    item.market_name.toLowerCase().includes(search.toLowerCase()) && 
    (item.rarity === 'Запрещенное' || item.rarity === 'Засекреченное')
  );

  return (
    <div className="max-w-[1440px] mx-auto p-6 flex flex-col min-h-screen justify-between">
      <div>
        <div className="text-gray-500 text-xs mb-4">Главная / Калькулятор контрактов</div>
        <h2 className="text-white text-2xl font-bold mb-6">Калькулятор контрактов (Trade-up)</h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          {slots.map((slot, idx) => (
            <div key={idx} className="h-32 bg-[#1A1B23] border border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center p-2 text-center relative">
              {slot ? (
                <>
                  <span className="text-white text-xs line-clamp-2">{slot.market_name}</span>
                  <button 
                    onClick={() => {
                      const copy = [...slots];
                      copy[idx] = null;
                      setSlots(copy);
                    }} 
                    className="text-red-500 text-xs mt-2"
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

        {outcomes.length > 0 && (
          <section className="bg-[#1A1B23] p-6 rounded-xl border border-gray-800 text-white mb-8">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-6">Возможные результаты крафта</h3>
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
            <button onClick={clearSlots} className="mt-6 bg-[#FF9408] text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-600 transition text-sm">
              Очистить ячейки
            </button>
          </section>
        )}

        <section className="mt-8 bg-[#1A1B23] p-6 rounded-xl border border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h3 className="text-white font-bold">Выберите 10 предметов для контракта</h3>
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
      </div>

      <footer className="flex justify-between items-center py-6 border-t border-gray-800 text-gray-500 text-xs mt-12">
        <span>SteamS&C</span>
        <span>disclaimer - API source - © 2026</span>
      </footer>
    </div>
  );
};

export default TradeUp;