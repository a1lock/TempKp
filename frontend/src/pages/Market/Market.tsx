import { useState, useEffect } from 'react';
import { api } from '../../api/api';
import type { Item } from '../../types/items';
import { Search } from 'lucide-react';

const Market = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('');

  // загрузка предметов с бэкенда
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get('/items');
      setItems(res.data);
    } catch (error) {
      console.error('ошибка загрузки предметов', error);
    }
  };

  // локальная фильтрация для простоты (можно перенести на бэк)
  const filteredItems = items.filter(item => 
    item.market_name.toLowerCase().includes(search.toLowerCase()) &&
    (colorFilter ? item.color_hex === colorFilter : true)
  );

  return (
    <div className="flex gap-6 max-w-[1440px] mx-auto p-6">
      {/* сайдбар с фильтрами */}
      <aside className="w-64 bg-[#1A1B23] p-6 rounded-xl h-fit shrink-0">
        <h3 className="text-white font-bold text-lg mb-4">Фильтры</h3>
        
        <div className="relative mb-6">
          <input 
            type="text" 
            placeholder="Поиск..." 
            className="w-full bg-[#0F1014] text-white p-2 pl-8 rounded border border-gray-700 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute left-2 top-2.5 text-gray-500" size={18} />
        </div>

        <div className="mb-6">
          <h4 className="text-gray-400 mb-2 text-sm">Цвет</h4>
          <div className="flex gap-2 flex-wrap">
            {['#800020', '#1a1a1a', '#FFD700', '#40E0D0', '#50C878'].map(color => (
              <button 
                key={color}
                onClick={() => setColorFilter(color === colorFilter ? '' : color)}
                className={`w-6 h-6 rounded-full border-2 ${colorFilter === color ? 'border-white' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* сетка предметов */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-[#1A1B23] p-4 rounded-xl flex flex-col items-center hover:-translate-y-1 transition duration-200">
            <div className="w-full h-1 rounded-t-xl mb-4" style={{ backgroundColor: item.color_hex }} />
            <img src={`/img/${item.image_url}`} alt={item.market_name} className="h-32 object-contain mb-4" />
            <div className="w-full mt-auto">
              <p className="text-gray-400 text-xs">{item.weapon_type}</p>
              <h4 className="text-white font-bold text-sm truncate">{item.market_name}</h4>
              <p className="text-[#FF9408] font-bold mt-2">{Number(item.price)} ₽</p>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

export default Market;