import { useState, useEffect } from 'react';
import { api } from '../../api';
import type { Item } from '../../types';

const TradeUp = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [slots, setSlots] = useState<(Item | null)[]>(Array(10).fill(null));
  const [targetId, setTargetId] = useState<number | ''>('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    api.get('/items').then(res => setItems(res.data));
  }, []);

  const handleAddItem = (item: Item) => {
    const emptyIndex = slots.findIndex(s => s === null);
    if (emptyIndex !== -1) {
      const newSlots = [...slots];
      newSlots[emptyIndex] = item;
      setSlots(newSlots);
    }
  };

  const handleCalculate = async () => {
    const itemIds = slots.filter(s => s !== null).map(s => s?.id);
    if (itemIds.length < 10 || !targetId) {
      alert('заполните все 10 слотов и укажите желаемый результат');
      return;
    }

    try {
      const res = await api.post('/contracts/calculate', { 
        inputItemIds: itemIds, 
        targetItemId: Number(targetId) 
      });
      setResult(res.data);
    } catch (error) {
      alert('ошибка при расчете контракта. проверьте данные.');
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <h2 className="text-2xl text-white font-bold mb-6">Калькулятор контрактов</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {slots.map((slot, idx) => (
          <div key={idx} className="h-28 bg-[#1A1B23] border border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center p-2 text-center">
            {slot ? (
              <>
                <span className="text-xs text-white line-clamp-2">{slot.market_name}</span>
                <button onClick={() => {
                  const newSlots = [...slots];
                  newSlots[idx] = null;
                  setSlots(newSlots);
                }} className="text-red-500 text-xs mt-2">убрать</button>
              </>
            ) : (
              <span className="text-gray-500 text-2xl">+</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8 bg-[#1A1B23] p-4 rounded-xl border border-gray-800">
        <select 
          className="p-3 bg-[#0F1014] text-white border border-gray-700 rounded w-full md:w-80 outline-none"
          value={targetId} onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">Выберите результат крафта...</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.market_name}</option>)}
        </select>
        <button onClick={handleCalculate} className="bg-[#FF9408] text-white px-6 py-3 rounded font-bold hover:bg-orange-600 transition">
          Рассчитать агрегацию
        </button>
      </div>

      {result && (
        <div className="bg-[#1A1B23] p-6 rounded-xl border border-gray-700 text-white flex flex-wrap gap-12">
          <div>
            <p className="text-gray-400 text-sm mb-1">Прогноз износа (Float)</p>
            <p className="text-3xl font-bold">{result.result_float.toFixed(5)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Ожидаемая прибыль</p>
            <p className={`text-3xl font-bold ${result.expected_profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {result.expected_profit > 0 ? '+' : ''}{result.expected_profit} ₽
            </p>
          </div>
        </div>
      )}

      <div className="mt-12">
        <h3 className="text-gray-400 mb-4 text-sm uppercase">выбор предметов для контракта</h3>
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <button key={item.id} onClick={() => handleAddItem(item)} className="bg-[#0F1014] text-gray-300 text-xs p-2 rounded hover:bg-gray-800 border border-gray-700">
              {item.market_name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TradeUp;