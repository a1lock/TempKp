import { useState } from 'react';
import { api } from '../../api';

const Admin = () => {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file) return alert('сначала выберите csv файл');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await api.post('/items/upload-prices', formData);
      alert('база цен успешно обновлена');
      setFile(null); // очистка после загрузки
    } catch (e) {
      alert('ошибка при загрузке прайс-листа');
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto p-8">
      <h2 className="text-2xl text-white font-bold mb-6">Панель администратора</h2>
      <div className="bg-[#1A1B23] p-6 rounded-xl border border-gray-800 max-w-md">
        <h3 className="text-white mb-4 font-medium">Импорт котировок (CSV)</h3>
        <input 
          type="file" 
          accept=".csv"
          className="text-gray-400 mb-6 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#0F1014] file:text-white hover:file:bg-gray-800"
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
        />
        <button onClick={handleUpload} className="w-full bg-[#5EADFF] text-white px-4 py-2 rounded font-medium hover:bg-blue-500">
          Загрузить и обновить
        </button>
      </div>
    </div>
  );
};

export default Admin;