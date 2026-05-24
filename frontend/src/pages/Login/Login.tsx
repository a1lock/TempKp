import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // отправляем запрос на авторизацию
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);
      navigate('/market');
    } catch (error) {
      alert('ошибка авторизации. проверьте данные.');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#0B0C10]">
      <form onSubmit={handleLogin} className="bg-[#1A1B23] p-8 rounded-xl flex flex-col gap-4 w-96">
        <h2 className="text-white text-2xl font-bold mb-4">Вход в систему</h2>
        <input 
          type="email" 
          placeholder="Email" 
          className="p-3 rounded bg-[#0F1014] text-white outline-none border border-gray-700"
          value={email} onChange={(e) => setEmail(e.target.value)} 
        />
        <input 
          type="password" 
          placeholder="Пароль" 
          className="p-3 rounded bg-[#0F1014] text-white outline-none border border-gray-700"
          value={password} onChange={(e) => setPassword(e.target.value)} 
        />
        <button type="submit" className="bg-[#FF9408] text-white p-3 rounded font-bold hover:bg-orange-600 transition">
          Войти
        </button>
      </form>
    </div>
  );
}

export default Login;