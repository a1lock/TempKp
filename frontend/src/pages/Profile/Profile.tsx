import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../api';
import type { Collection, ContractHistory } from '../../types';

const Profile = () => {
  const { user, logout } = useContext(AuthContext);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [contracts, setContracts] = useState<ContractHistory[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      api.get('/collections').then(res => setCollections(res.data)).catch(console.error);
      api.get('/contracts/history').then(res => setContracts(res.data)).catch(console.error);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const deleteCollection = async (id: number) => {
    try {
      await api.delete(`/collections/${id}`);
      setCollections(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-[1440px] mx-auto p-6 flex flex-col min-h-screen justify-between">
      <div>
        <h2 className="text-white text-3xl font-bold mb-8">Личный кабинет</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* профиль */}
          <section className="bg-[#1A1B23] p-6 rounded-xl border border-gray-800 h-fit">
            <h3 className="text-white font-bold text-lg mb-4">Информация о пользователе</h3>
            <div className="mb-4">
              <span className="text-gray-400 text-xs block mb-1">Email</span>
              <span className="text-white text-sm font-medium">{user.email}</span>
            </div>
            <div className="mb-6">
              <span className="text-gray-400 text-xs block mb-1">Роль в системе</span>
              <span className="text-white text-sm font-medium uppercase">{user.role}</span>
            </div>
            <button onClick={handleLogout} className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-bold transition">
              Выйти из аккаунта
            </button>
          </section>

          {/* сборки */}
          <section className="lg:col-span-2 bg-[#1A1B23] p-6 rounded-xl border border-gray-800">
            <h3 className="text-white font-bold text-lg mb-6">Мои сохраненные сборки ({collections.length})</h3>
            <div className="flex flex-col gap-4">
              {collections.map(col => (
                <div key={col.id} className="flex justify-between items-center bg-[#13141A] p-4 rounded-lg border border-gray-800">
                  <div>
                    <h4 className="text-white font-bold">{col.title}</h4>
                  </div>
                  <button onClick={() => deleteCollection(col.id)} className="text-red-400 hover:text-red-300 text-sm">
                    удалить
                  </button>
                </div>
              ))}
            </div>

            {/* история контрактов */}
            <h3 className="text-white font-bold text-lg mt-10 mb-6">История расчетов</h3>
            <div className="flex flex-col gap-4">
              {contracts.map(con => (
                <div key={con.id} className="flex justify-between items-center bg-[#13141A] p-4 rounded-lg border border-gray-800">
                  <div>
                    <span className="text-gray-500 text-xs">{new Date(con.created_at).toLocaleDateString()}</span>
                    <h4 className="text-white font-bold text-sm mt-1">Результат: {con.market_name || 'Неизвестно'}</h4>
                    <p className="text-gray-400 text-xs mt-1">Вычисленный Float: {Number(con.result_float).toFixed(4)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 block">Стоимость входа</span>
                    <span className="text-white font-bold text-sm">{con.input_items_cost} ₽</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <footer className="flex justify-between items-center py-6 border-t border-gray-800 text-gray-500 text-xs mt-12">
        <span>SteamS&C</span>
        <span>disclaimer - API source - © 2026</span>
      </footer>
    </div>
  );
};

export default Profile;