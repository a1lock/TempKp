import { useState, useEffect } from 'react';
import { api } from '../../api';
import type { Item } from '../../types';
import { Search } from 'lucide-react';

const Market = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(300000);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedExteriors, setSelectedExteriors] = useState<string[]>([]);

  useEffect(() => {
    api.get('/items').then(res => setItems(res.data)).catch(console.error);
  }, []);

  const handleTypeChange = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleExteriorChange = (ext: string) => {
    setSelectedExteriors(prev => 
      prev.includes(ext) ? prev.filter(e => e !== ext) : [...prev, ext]
    );
  };

  const resetFilters = () => {
    setSearch('');
    setColorFilter('');
    setMinPrice(0);
    setMaxPrice(300000);
    setSelectedTypes([]);
    setSelectedExteriors([]);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.market_name.toLowerCase().includes(search.toLowerCase());
    const matchesColor = colorFilter ? item.color_hex === colorFilter : true;
    const matchesPrice = Number(item.price) >= minPrice && Number(item.price) <= maxPrice;
    const matchesType = selectedTypes.length > 0 ? selectedTypes.includes(item.weapon_type) : true;
    const matchesExterior = selectedExteriors.length > 0 ? selectedExteriors.includes(item.exterior) : true;
    return matchesSearch && matchesColor && matchesPrice && matchesType && matchesExterior;
  });

  return (
    <div className="max-w-[1440px] mx-auto p-6 flex flex-col min-h-screen justify-between">
      <div>
        <div className="text-gray-500 text-xs mb-4">Главная / Каталог предметов</div>
        <h2 className="text-white text-2xl font-bold mb-6">Каталог предметов</h2>

        {/* верхний поиск и сортировка */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Поиск по названию..." 
              className="w-full bg-[#1A1B23] text-white p-3 pr-10 rounded-lg border border-gray-800 outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Search className="absolute right-3 top-3.5 text-gray-500" size={18} />
          </div>
          <select className="bg-[#1A1B23] text-white p-3 rounded-lg border border-gray-800 outline-none">
            <option>Сортировка: цена</option>
          </select>
        </div>

        {/* сетка и сайдбар */}
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="w-full md:w-64 bg-[#1A1B23] p-6 rounded-xl border border-gray-800 h-fit shrink-0">
            <h3 className="text-white font-bold text-lg mb-4">Фильтры</h3>
            
            {/* цена */}
            <div className="mb-6">
              <span className="text-gray-400 text-xs block mb-2">Цена</span>
              <div className="flex gap-2 mb-2">
                <input 
                  type="number" placeholder="от" 
                  className="w-1/2 bg-[#0F1014] text-white p-2 rounded text-xs border border-gray-800"
                  value={minPrice || ''} onChange={e => setMinPrice(Number(e.target.value))}
                />
                <input 
                  type="number" placeholder="до" 
                  className="w-1/2 bg-[#0F1014] text-white p-2 rounded text-xs border border-gray-800"
                  value={maxPrice || ''} onChange={e => setMaxPrice(Number(e.target.value))}
                />
              </div>
            </div>

            {/* тип оружия */}
            <div className="mb-6">
              <span className="text-gray-400 text-xs block mb-2">Категория</span>
              {['Knife', 'Gloves', 'Pistol', 'Rifle', 'Sniper Rifle', 'SMG'].map(type => (
                <label key={type} className="flex items-center gap-2 text-white text-xs mb-2 cursor-pointer">
                  <input 
                    type="checkbox" checked={selectedTypes.includes(type)}
                    onChange={() => handleTypeChange(type)}
                    className="rounded bg-[#0F1014] border-gray-800"
                  />
                  {type === 'Knife' ? 'Ножи' : type === 'Gloves' ? 'Перчатки' : type === 'Pistol' ? 'Пистолеты' : type === 'Rifle' ? 'Винтовки' : type === 'Sniper Rifle' ? 'Снайперские' : 'Пистолеты-пулеметы'}
                </label>
              ))}
            </div>

            {/* палитра цветов */}
            <div className="mb-6">
              <span className="text-gray-400 text-xs block mb-2">Цветовая гамма</span>
              <div className="flex gap-1.5 flex-wrap">
                {['#ffffff', '#1a1a1a', '#FFD700', '#40E0D0', '#50C878', '#FF8C00', '#800020', '#8b0000', '#ff1493', '#0a1738'].map(color => (
                  <button 
                    key={color}
                    onClick={() => setColorFilter(color === colorFilter ? '' : color)}
                    className={`w-6 h-6 rounded-md border ${colorFilter === color ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* износ */}
            <div className="mb-6">
              <span className="text-gray-400 text-xs block mb-2">Износ</span>
              {['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'].map(ext => (
                <label key={ext} className="flex items-center gap-2 text-white text-xs mb-2 cursor-pointer">
                  <input 
                    type="checkbox" checked={selectedExteriors.includes(ext)}
                    onChange={() => handleExteriorChange(ext)}
                    className="rounded bg-[#0F1014] border-gray-800"
                  />
                  {ext === 'Factory New' ? 'Прямо с завода' : ext === 'Minimal Wear' ? 'Немного поношенное' : ext === 'Field-Tested' ? 'После полевых' : ext === 'Well-Worn' ? 'Поношенное' : 'Закаленное в боях'}
                </label>
              ))}
            </div>

            <button onClick={resetFilters} className="text-gray-500 hover:text-white text-xs w-full text-center mt-4">
              сбросить фильтры
            </button>
          </aside>

          {/* сетка карточек */}
          <main className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-[#1A1B23] p-4 rounded-xl flex flex-col justify-between border border-gray-800 h-96">
                <div className="w-full h-1 rounded-t-xl mb-4" style={{ backgroundColor: item.color_hex }} />
                <div className="flex-1 flex items-center justify-center p-4">
                  {/* бокс-плейсхолдер по вайрфреймам */}
                  <div className="w-full h-full border border-gray-800 flex items-center justify-center relative bg-[#13141A]">
                    <div className="absolute w-full h-[1px] bg-gray-800 rotate-12" />
                    <div className="absolute w-full h-[1px] bg-gray-800 -rotate-12" />
                    <span className="text-gray-600 text-xs z-10 font-mono">{item.image_url}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-gray-400 text-xs">{item.weapon_type}</p>
                  <h4 className="text-white font-bold text-sm truncate">{item.market_name}</h4>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-500 text-xs">{item.exterior}</span>
                    <span className="bg-[#13141A] text-[#FF9408] px-3 py-1.5 rounded-md font-bold text-sm">
                      {Number(item.price)} ₽
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </main>
        </div>
      </div>

      <footer className="flex justify-between items-center py-6 border-t border-gray-800 text-gray-500 text-xs mt-12">
        <span>SteamS&C</span>
        <span>disclaimer - API source - © 2026</span>
      </footer>
    </div>
  );
};

export default Market;