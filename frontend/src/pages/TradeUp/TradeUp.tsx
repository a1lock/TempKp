import { useState, useEffect } from 'react';
import { api } from '../api';
import { Item } from '../types';

const TradeUp = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [slots, setSlots] = useState<(Item | null)[]>(Array(10).fill(null));
  const [targetId, setTargetId] = useState<number | ''>('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    api.get('/items').then(res => setItems(res.data));
  }, []);

  // добавление предмета в свободный слот
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
      alert('заполните все 10 слотов и выберите предмет для крафта');
      return;
    }

    try {
      // отправка данных для расчета на бэкенд
      const res = await api.post('/contracts/calculate', { 
        inputItemIds: itemIds, 
        targetItemId: Number(targetId) 
      });
      setResult(res.data);
    } catch (error) {
      alert('ошибка при расчете контракта');
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <h2 className="text-2xl text-white font-bold mb-6">Калькулятор контрактов</h2>
      
      {/* сетка 2x5 */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {slots.map((slot, idx) => (
          <div key={idx} className="h-32 bg-[#1A1B23] border border-dashed border-gray-600 rounded-xl flex items-center justify-center p-2 text-center">
            {slot ? (
              <div>
                <span className="text-xs text-white">{slot.market_name}</span>
                <button onClick={() => {
                  const newSlots = [...slots];
                  newSlots[idx] = null;
                  setSlots(newSlots);
                }} className="text-red-500 text-xs block mt-2">убрать</button>
              </div>
            ) : (
              <span className="text-gray-500 text-2xl">+</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-4 mb-8 bg-[#1A1B23] p-4 rounded-xl">
        <select 
          className="p-3 bg-[#0F1014] text-white border border-gray-700 rounded w-64 outline-none"
          value={targetId} onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">Выберите ожидаемый предмет...</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.market_name}</option>)}
        </select>
        <button onClick={handleCalculate} className="bg-[#FF9408] text-white px-6 py-3 rounded font-bold hover:bg-orange-600">
          Рассчитать контракт
        </button>
      </div>

      {/* результат расчета */}
      {result && (
        <div className="bg-[#1A1B23] p-6 rounded-xl border border-gray-700 text-white flex justify-between">
          <div>
            <p className="text-gray-400 text-sm">Прогноз Float</p>
            <p className="text-3xl font-bold">{result.result_float.toFixed(5)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Ожидаемая прибыль</p>
            <p className={`text-3xl font-bold ${result.expected_profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {result.expected_profit > 0 ? '+' : ''}{result.expected_profit} ₽
            </p>
          </div>
        </div>
      )}

      {/* список для выбора (упрощенный инвентарь) */}
      <div className="mt-8">
        <h3 className="text-white mb-4">Доступные предметы (кликните для добавления)</h3>
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <button key={item.id} onClick={() => handleAddItem(item)} className="bg-[#1A1B23] text-gray-300 text-xs p-2 rounded hover:bg-gray-700 border border-gray-700">
              {item.market_name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TradeUp;