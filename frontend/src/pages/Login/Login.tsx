import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { AuthContext } from '../../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent, type: 'login' | 'register') => {
    e.preventDefault();
    try {
      const endpoint = type === 'login' ? '/auth/login' : '/auth/register';
      const res = await api.post(endpoint, { email, password });
      login(res.data.token, res.data.user);
      navigate('/market');
    } catch (error) {
      alert('ошибка авторизации или пользователь уже существует');
    }
  };

  return (
    <div className="flex h-[80vh] items-center justify-center">
      <form className="bg-[#1A1B23] p-8 rounded-xl flex flex-col gap-4 w-96 border border-gray-800">
        <h2 className="text-white text-2xl font-bold mb-4 text-center">Вход в систему</h2>
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
        <div className="flex gap-2 mt-4">
          <button onClick={(e) => handleAuth(e, 'login')} className="flex-1 bg-[#FF9408] text-white p-3 rounded font-bold hover:bg-orange-600">
            Войти
          </button>
          <button onClick={(e) => handleAuth(e, 'register')} className="flex-1 bg-gray-700 text-white p-3 rounded font-bold hover:bg-gray-600">
            Регистрация
          </button>
        </div>
      </form>
    </div>
  );
}

export default Login;