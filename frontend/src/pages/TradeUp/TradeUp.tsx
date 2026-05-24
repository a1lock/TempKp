import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import type { Item } from '../../types';

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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [result, setResult] = useState<{
    input_items_cost: number;
    expected_profit: number;
    min_profit: number;
    max_profit: number;
    success_chance: number;
    result_float: number;
    exterior_name: string;
  } | null>(null);

  useEffect(() => {
    // загружаем предметы каталога
    api.get('/items')
      .then(res => {
        const filtered = res.data.filter((item: Item) => 
          item.rarity === 'Запрещенное' || item.rarity === 'Засекреченное'
        );
        setItems(filtered);
      })
      .catch(err => console.error('ошибка загрузки каталога:', err));

    // загружаем историю расчетов пользователя
    fetchHistory();
  }, []);

  const fetchHistory = () => {
    api.get('/contracts/history')
      .then(res => setHistory(res.data))
      .catch(err => console.error('ошибка загрузки истории:', err));
  };

  const handleAddItem = (item: Item) => {
    const emptyIndex = slots.findIndex(s => s === null);
    if (emptyIndex !== -1) {
      const newSlots = [...slots];
      newSlots[emptyIndex] = item;
      setSlots(newSlots);
    }
  };

  const handleRemoveItem = (index: number) => {
    const newSlots = [...slots];
    newSlots[index] = null;
    setSlots(newSlots);
  };

  const handleClear = () => {
    setSlots(Array(10).fill(null));
    setResult(null);
  };

  const handleCalculate = async () => {
    const activeSlots = slots.filter(s => s !== null) as Item[];
    if (activeSlots.length < 10) {
      alert('заполните все 10 ячеек для проведения контракта');
      return;
    }

    const payload = {
      items: activeSlots.map(item => ({
        id: item.id,
        float: item.exterior === 'Field-Tested' ? 0.38 : 0.05 
      }))
    };

    try {
      const res = await api.post('/contracts/calculate', payload);
      setResult(res.data);
      fetchHistory(); // обновляем список истории снизу
    } catch (error) {
      console.error('ошибка расчета:', error);
      alert('ошибка при расчете контракта');
    }
  };

  // загрузка деталей контракта из истории при клике (новый метод)
  const handleLoadDetails = async (id: number) => {
    try {
      const res = await api.get(`/contracts/${id}`);
      // заполняем слоты предметами из истории
      const newSlots = Array(10).fill(null);
      res.data.items.forEach((item: Item, index: number) => {
        if (index < 10) newSlots[index] = item;
      });
      setSlots(newSlots);
      
      // имитируем вывод результатов для этого контракта
      setResult({
        input_items_cost: Number(res.data.input_items_cost),
        expected_profit: Number(res.data.expected_profit),
        min_profit: 0, 
        max_profit: 0,
        success_chance: 100,
        result_float: res.data.result_float,
        exterior_name: 'по истории'
      });
    } catch (err) {
      alert('ошибка при загрузке деталей контракта');
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto p-6 text-white bg-[#0B0C10] min-h-[90vh]">
      <div className="mb-4 text-xs text-gray-500">
        Главная / Калькулятор контрактов
      </div>
      
      <h2 className="text-2xl font-bold mb-6">Калькулятор контрактов (Trade-up)</h2>

      {/* сетка слотов */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        {slots.map((slot, idx) => (
          <div 
            key={idx} 
            className="bg-[#1A1B23] border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-between text-center min-h-[140px]"
          >
            {slot ? (
              <>
                <span className="text-xs font-semibold">{slot.market_name}</span>
                <span className="text-xs text-[#FF9408] font-bold mt-2">0.38</span>
                <button 
                  onClick={() => handleRemoveItem(idx)} 
                  className="text-red-500 text-xs mt-auto hover:underline"
                >
                  убрать
                </button>
              </>
            ) : (
              <span className="text-gray-600 text-3xl my-auto font-light">+</span>
            )}
          </div>
        ))}
      </div>

      <div className="text-center mb-6">
        <span className="text-xs text-gray-500 block mb-1">Заполнено ячеек:</span>
        <span className="bg-black px-3 py-1 rounded text-xs font-bold text-[#FF9408]">
          {slots.filter(s => s !== null).length} / 10
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <span className="text-xs text-gray-400 block mb-1">Шанс исхода</span>
              <span className="text-2xl font-extrabold">{result.success_chance}%</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">Ожидаемая прибыль</span>
              <span className={`text-2xl font-extrabold ${result.expected_profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {result.expected_profit >= 0 ? '+' : ''}{result.expected_profit} ₽
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">Прогноз Float</span>
              <span className="text-2xl font-extrabold">{result.result_float.toFixed(3)}</span>
              <span className="text-xs text-gray-500 block mt-1">({result.exterior_name})</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">Сумма входа</span>
              <span className="text-2xl font-extrabold text-white">{result.input_items_cost} ₽</span>
            </div>
          </div>
        </div>
      )}

      {/* доступные предметы */}
      <div className="bg-[#1A1B23] border border-gray-800 rounded-xl p-6 mb-8">
        <h3 className="text-sm font-bold text-[#FF9408] mb-4">Доступные предметы для контракта</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto pr-2">
          {items.map(item => (
            <button 
              key={item.id} 
              onClick={() => handleAddItem(item)} 
              className="bg-[#0F1014] hover:bg-[#1C1D24] border border-gray-800 text-left p-4 rounded-lg flex flex-col justify-between transition"
            >
              <span className="text-xs font-bold text-white mb-2">{item.market_name}</span>
              <span className="text-xs text-[#FF9408] font-bold">{Number(item.price)} ₽</span>
            </button>
          ))}
        </div>
      </div>

      {/* история проведенных расчетов */}
      <div className="bg-[#1A1B23] border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-bold text-white mb-4">История проведенных расчетов</h3>
        <div className="flex flex-col gap-4">
          {history.map(h => (
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
                  Результат: {h.result_name}
                </span>
                <span className="text-xs text-gray-400">
                  Вычисленный Float: {Number(h.result_float).toFixed(4)}
                </span>
              </div>
              <span className="text-[#FF9408] font-bold">{Number(h.input_items_cost)} ₽</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TradeUp;