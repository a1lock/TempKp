import { useState, useEffect } from 'react';
import { api } from '../../api';
import type { Item, Collection } from '../../types';

const SetBuilder = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [title, setTitle] = useState('Новая сборка');

  useEffect(() => {
    api.get('/items').then(res => setItems(res.data));
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const res = await api.get('/collections');
      setCollections(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (selectedItems.length === 0) return alert('добавьте предметы');
    try {
      const itemIds = selectedItems.map(i => i.id);
      await api.post('/collections', { title, itemIds });
      alert('сборка сохранена');
      fetchCollections();
    } catch (e) {
      alert('ошибка при сохранении');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/collections/${id}`);
      fetchCollections();
    } catch (e) {
      alert('ошибка при удалении');
    }
  };

  const handleExportCSV = () => {
    if (selectedItems.length === 0) return alert('нет предметов для экспорта');
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + "Название,Оружие,Цена\n" 
      + selectedItems.map(i => `${i.market_name},${i.weapon_type},${i.price}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPrice = selectedItems.reduce((sum, item) => sum + Number(item.price), 0);

  return (
    <div className="max-w-[1440px] mx-auto p-6 flex flex-col md:flex-row gap-6">
      <div className="flex-1">
        <h2 className="text-2xl text-white font-bold mb-6">Конструктор наборов</h2>
        <div className="bg-[#1A1B23] p-4 rounded-xl border border-gray-800 mb-6 min-h-[150px]">
          <h3 className="text-gray-400 mb-4 text-sm">Текущий состав (кликните чтобы убрать):</h3>
          <div className="flex flex-wrap gap-2">
            {selectedItems.map((item, idx) => (
              <button 
                key={idx} 
                onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))} 
                className="bg-[#0F1014] text-white p-2 rounded text-xs border border-gray-700 hover:border-red-500"
              >
                {item.market_name}
              </button>
            ))}
          </div>
        </div>

        <h3 className="text-gray-400 mb-4 text-sm">Доступные предметы:</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {items.map(item => (
            <button 
              key={item.id} 
              onClick={() => setSelectedItems([...selectedItems, item])}
              className="bg-[#1A1B23] text-gray-300 text-xs p-3 rounded hover:bg-gray-800 border border-gray-800 text-left"
            >
              <span className="block font-bold text-white mb-1 truncate">{item.market_name}</span>
              <span className="text-[#FF9408]">{Number(item.price)} ₽</span>
            </button>
          ))}
        </div>
      </div>

      <aside className="w-full md:w-80 bg-[#1A1B23] p-6 rounded-xl border border-gray-800 h-fit">
        <input 
          type="text" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          className="w-full bg-[#0F1014] text-white p-2 rounded mb-6 outline-none border border-gray-700"
        />
        <div className="mb-6">
          <p className="text-gray-400 text-sm">Общая стоимость</p>
          <p className="text-3xl text-white font-bold">{totalPrice} ₽</p>
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={handleSave} className="bg-[#5EADFF] text-white py-2 rounded font-medium hover:bg-blue-500">Сохранить сборку</button>
          <button onClick={handleExportCSV} className="bg-gray-700 text-white py-2 rounded font-medium hover:bg-gray-600">Экспорт в CSV</button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700">
          <h4 className="text-white font-bold mb-4">Мои сохраненные сборки</h4>
          <div className="flex flex-col gap-2">
            {collections.map(c => (
              <div key={c.id} className="flex justify-between items-center bg-[#0F1014] p-3 rounded text-sm text-gray-300 border border-gray-800">
                <span className="truncate pr-2">{c.title}</span>
                <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300">удалить</button>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default SetBuilder;