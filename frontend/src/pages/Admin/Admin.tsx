import { useState, useEffect, useContext } from 'react';
import { api } from '../../api';
import type { User } from '../../types';
import { AuthContext } from '../../context/AuthContext';

const Admin = () => {
  const { user } = useContext(AuthContext);
  const [file, setFile] = useState<File | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsersList(res.data);
    } catch (e) {
      console.error('ошибка получения списка пользователей', e);
    }
  };

  // отправляет CSV как multipart/form-data бэкенд обновляет цены в БД
  const handleUpload = async () => {
    if (!file) return alert('сначала выберите csv файл');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/items/upload-prices', formData);
      alert(res.data.message);
      setFile(null);
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'ошибка при загрузке прайс-листа';
      alert(msg);
    }
  };

  // защита от удаления самого себя есть и на фронте, и на бэке
  const handleDeleteUser = async (id: number) => {
    if (id === user?.id) {
      alert('нельзя удалить собственную учетную запись администратора');
      return;
    }
    if (!window.confirm('вы уверены, что хотите удалить этого пользователя?')) return;

    try {
      await api.delete(`/users/${id}`);
      setUsersList(prev => prev.filter(u => u.id !== id));
      alert('пользователь успешно удален');
    } catch (e) {
      alert('ошибка при удалении пользователя');
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto p-6 flex flex-col min-h-screen justify-between">
      <div>
        <h2 className="text-white text-2xl font-bold mb-6">Панель администратора</h2>
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* импорт прайсов */}
          <div className="bg-[#1A1B23] p-6 rounded-xl border border-gray-800 h-fit w-full lg:w-96">
            <h3 className="text-white mb-4 font-medium">Импорт котировок (CSV)</h3>
            <input 
              type="file" 
              accept=".csv"
              className="text-gray-400 mb-6 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#0F1014] file:text-white hover:file:bg-gray-800"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            />
            <button onClick={handleUpload} className="w-full bg-[#5EADFF] text-white px-4 py-2 rounded hover:bg-blue-500 transition">
              Загрузить и обновить
            </button>
          </div>

          {/* таблица пользователей */}
          <div className="flex-1 bg-[#1A1B23] p-6 rounded-xl border border-gray-800">
            <h3 className="text-white mb-4 font-medium">Управление пользователями</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Роль</th>
                    <th className="py-3 px-4 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-300">
                  {usersList.map(u => (
                    <tr key={u.id} className="border-b border-gray-800/50 hover:bg-[#13141A]">
                      <td className="py-3 px-4">{u.id}</td>
                      <td className="py-3 px-4">{u.email}</td>
                      <td className="py-3 px-4 uppercase text-xs">{u.role}</td>
                      <td className="py-3 px-4 text-right">
                        {u.id !== user?.id && (
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-400 hover:text-red-300 transition text-xs"
                          >
                            Удалить
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <footer className="flex justify-between items-center py-6 border-t border-gray-800 text-gray-500 text-xs mt-12">
        <span>SteamS&C</span>
        <span>disclaimer - API source - © 2026</span>
      </footer>
    </div>
  );
};

export default Admin;