import { useState, useEffect } from 'react';
import { api } from '../../api';
import { Item } from '../../types';
import { Search } from 'lucide-react';

const Market = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('');

  useEffect(() => {
    api.get('/items').then(res => setItems(res.data)).catch(console.error);
  }, []);

  const filteredItems = items.filter(item => 
    item.market_name.toLowerCase().includes(search.toLowerCase()) &&
    (colorFilter ? item.color_hex === colorFilter : true)
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-[1440px] mx-auto p-6">
      <aside className="w-full md:w-64 bg-[#1A1B23] p-6 rounded-xl h-fit shrink-0 border border-gray-800">
        <h3 className="text-white font-bold text-lg mb-4">Фильтры</h3>
        
        <div className="relative mb-6">
          <input 
            type="text" 
            placeholder="Поиск..." 
            className="w-full bg-[#0F1014] text-white p-2 pl-8 rounded border border-gray-700 outline-none"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute left-2 top-2.5 text-gray-500" size={18} />
        </div>

        <div>
          <h4 className="text-gray-400 mb-2 text-sm">Цветовая гамма</h4>
          <div className="flex gap-2 flex-wrap">
            {['#800020', '#1a1a1a', '#FFD700', '#40E0D0', '#50C878', '#FF8C00'].map(color => (
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

      <main className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-[#1A1B23] p-4 rounded-xl flex flex-col border border-gray-800">
            <div className="w-full h-1 rounded-t-xl mb-4" style={{ backgroundColor: item.color_hex }} />
            <div className="h-32 mb-4 bg-gray-800 rounded flex items-center justify-center text-gray-500">
              <span className="text-xs">img: {item.image_url}</span>
            </div>
            <div className="mt-auto">
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