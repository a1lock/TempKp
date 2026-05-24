import { useState, useEffect } from 'react';
import { api } from '../../api';
import type { Item, Collection } from '../../types';
import { Search } from 'lucide-react';


const SetBuilder = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [title, setTitle] = useState('Новая сборка');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [modalSearch, setModalSearch] = useState('');
  
  // состояние для режима редактирования комплекта
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchCollections = async () => {
    try {
      const res = await api.get('/collections');
      setCollections(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    api.get('/items').then(res => setItems(res.data)).catch(console.error);
    fetchCollections();
  }, []);

  const handleSave = async () => {
    if (selectedItems.length === 0) return alert('добавьте хотя бы один предмет');
    const itemIds = selectedItems.map(i => i.id);
    
    try {
      if (editingId) {
        // если режим редактирования — отправляем PUT-запрос
        await api.put(`/collections/${editingId}`, { title, itemIds });
        alert('комплект успешно обновлен');
        setEditingId(null);
      } else {
        // иначе создаем новый набор через POST-запрос
        await api.post('/collections', { title, itemIds });
        alert('комплект успешно сохранен');
      }
      setTitle('Новая сборка');
      setSelectedItems([]);
      fetchCollections();
    } catch (e) {
      alert('ошибка при сохранении');
    }
  };

  const handleEditLoad = async (col: Collection) => {
    try {
      const res = await api.get(`/collections/${col.id}`);
      setSelectedItems(res.data.items || []);
      setTitle(col.title);
      setEditingId(col.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      alert('ошибка загрузки комплекта для редактирования');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('вы уверены, что хотите удалить этот комплект?')) return;
    try {
      await api.delete(`/collections/${id}`);
      fetchCollections();
      if (editingId === id) {
        setEditingId(null);
        setTitle('Новая сборка');
        setSelectedItems([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCSV = () => {
    if (selectedItems.length === 0) return alert('нет предметов для выгрузки');
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + "Название,Категория,Цена\n" 
      + selectedItems.map(i => `"${i.market_name}","${i.weapon_type}",${i.price}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openSelectionModal = (category: string) => {
    setActiveCategory(category);
    setModalSearch('');
    setIsModalOpen(true);
  };

  const selectItemFromModal = (item: Item) => {
    setSelectedItems(prev => [...prev, item]);
    setIsModalOpen(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTitle('Новая сборка');
    setSelectedItems([]);
  };

  const totalPrice = selectedItems.reduce((sum, item) => sum + Number(item.price), 0);
  const averageFloat = selectedItems.length > 0 
    ? (selectedItems.reduce((sum, item) => sum + ((item.min_float + item.max_float) / 2), 0) / selectedItems.length).toFixed(3)
    : '0.000';

  const filteredModalItems = items.filter(item => 
    item.weapon_type === activeCategory &&
    item.market_name.toLowerCase().includes(modalSearch.toLowerCase()) &&
    !selectedItems.some(selected => selected.id === item.id)
  );

  return (
    <div className="max-w-[1440px] mx-auto p-6 flex flex-col min-h-screen justify-between relative">
      <div>
        <div className="text-gray-500 text-xs mb-4">Главная / Конструктор набора</div>
        
        {editingId && (
          <div className="bg-blue-900/30 border border-blue-500 text-blue-300 p-3 rounded-lg mb-4 text-sm flex justify-between items-center">
            <span>Редактирование комплекта: <strong>{title}</strong> (сохранение обновит текущую запись в бд)</span>
            <button onClick={cancelEditing} className="underline text-xs">отменить редактирование</button>
          </div>
        )}

        <h2 className="text-white text-2xl font-bold mb-6">Конструктор набора</h2>

        <div className="flex flex-col lg:flex-row gap-6 mb-12">
          {/* слоты */}
          <main className="flex-1 bg-[#1A1B23] p-6 rounded-xl border border-gray-800 flex flex-col gap-8">
            {['Knife', 'Gloves', 'Rifle'].map(cat => {
              const catItems = selectedItems.filter(i => i.weapon_type === cat);
              return (
                <div key={cat} className="border-b border-gray-800 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-center mb-4">
                    <span className="bg-[#2A2B35] text-white text-xs px-3 py-1 rounded font-bold">
                      {cat === 'Knife' ? 'Ножи' : cat === 'Gloves' ? 'Перчатки' : 'Винтовки'}
                    </span>
                    <span className="text-gray-500 text-xs">{catItems.length} / 4 слота</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array(4).fill(null).map((_, idx) => {
                      const item = catItems[idx];
                      return item ? (
                        <div key={idx} className="bg-[#13141A] p-3 rounded-xl border border-gray-800 flex flex-col justify-between h-40">
                          <div className="w-full h-1" style={{ backgroundColor: item.color_hex }} />
                          <span className="text-white text-xs truncate mt-2">{item.market_name}</span>
                          <div className="flex justify-between items-center mt-auto">
                            <span className="text-gray-500 text-xs">{Number(item.price)} ₽</span>
                            <button 
                              onClick={() => setSelectedItems(prev => prev.filter(i => i.id !== item.id))}
                              className="text-red-500 text-xs"
                            >
                              убрать
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          key={idx} 
                          onClick={() => openSelectionModal(cat)}
                          className="h-40 border border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:border-gray-500 transition"
                        >
                          <span className="text-xl mb-1">+</span>
                          <span className="text-xs">пустой слот</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </main>

          {/* панель параметров */}
          <aside className="w-full lg:w-96 bg-[#1A1B23] p-6 rounded-xl border border-gray-800 h-fit flex flex-col gap-6">
            <h3 className="text-white font-bold text-lg">Параметры набора</h3>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="bg-[#0F1014] text-white p-3 rounded-lg border border-gray-800 outline-none w-full"
            />
            <div>
              <span className="text-gray-400 text-xs block mb-1">Общая стоимость</span>
              <div className="bg-[#0F1014] text-[#FF9408] text-2xl font-bold p-3 rounded-lg text-center">
                {totalPrice} ₽
              </div>
            </div>
            <div>
              <span className="text-gray-400 text-xs block mb-1">Количество предметов</span>
              <div className="text-white text-sm font-medium">{selectedItems.length} из 12 макс.</div>
            </div>
            <div>
              <span className="text-gray-400 text-xs block mb-1">Средний Float</span>
              <div className="text-white text-sm font-medium">{averageFloat}</div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <button onClick={handleSave} className="w-full bg-[#FF9408] text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition">
                {editingId ? 'Сохранить изменения' : 'Сохранить набор'}
              </button>
              <button onClick={handleExportCSV} className="w-full bg-gray-700 text-white py-3 rounded-lg font-bold hover:bg-gray-600 transition">
                Экспорт в CSV
              </button>
            </div>
          </aside>
        </div>

        {/* сохраненные наборы внизу по вайрфреймам */}
        <section className="bg-[#1A1B23] p-6 rounded-xl border border-gray-800 mt-8">
          <h3 className="text-white font-bold text-lg mb-6">Сохраненные комплекты предметов</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collections.map(col => (
              <div key={col.id} className="flex justify-between items-center bg-[#13141A] p-4 rounded-lg border border-gray-800">
                <span className="text-white font-medium">{col.title}</span>
                <div className="flex gap-4">
                  <button onClick={() => handleEditLoad(col)} className="text-blue-400 hover:text-blue-300 text-sm">
                    редактировать
                  </button>
                  <button onClick={() => handleDelete(col.id)} className="text-red-400 hover:text-red-300 text-sm">
                    удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1B23] w-full max-w-lg rounded-xl p-6 border border-gray-800 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-lg">Выбор предмета ({activeCategory})</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="relative mb-4">
              <input 
                type="text" 
                placeholder="Поиск по названию..." 
                className="w-full bg-[#0F1014] text-white p-2 pl-8 rounded border border-gray-700 outline-none text-sm"
                value={modalSearch}
                onChange={e => setModalSearch(e.target.value)}
              />
              <Search className="absolute left-2 top-2.5 text-gray-500" size={16} />
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-2">
              {filteredModalItems.map(item => (
                <button 
                  key={item.id} 
                  onClick={() => selectItemFromModal(item)}
                  className="flex justify-between items-center p-3 bg-[#0F1014] hover:bg-gray-800 rounded-lg text-left text-sm text-white border border-gray-800 transition"
                >
                  <span>{item.market_name}</span>
                  <span className="text-[#FF9408] font-bold">{Number(item.price)} ₽</span>
                </button>
              ))}
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

export default SetBuilder;