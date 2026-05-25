import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { AuthContext } from '../../context/AuthContext';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const res = await api.post(endpoint, { email, password });
      login(res.data.token, res.data.user);
      navigate('/market');
    } catch (error) {
      alert('ошибка авторизации или пользователь уже зарегистрирован');
    }
  };

  return (
    <div className="flex h-[80vh] items-center justify-center px-4">
      <form onSubmit={handleAuth} className="bg-[#1A1B23] p-8 rounded-xl flex flex-col gap-4 w-full max-w-sm border border-gray-800">
        <h2 className="text-white text-2xl font-bold mb-4 text-center">
          {isRegister ? 'Регистрация' : 'Вход в систему'}
        </h2>
        <input 
          type="email" 
          placeholder="Email" 
          className="p-3 rounded bg-[#0F1014] text-white outline-none border border-gray-700"
          value={email} onChange={(e) => setEmail(e.target.value)} 
          required
        />
        <input 
          type="password" 
          placeholder="Пароль" 
          className="p-3 rounded bg-[#0F1014] text-white outline-none border border-gray-700"
          value={password} onChange={(e) => setPassword(e.target.value)} 
          required
        />
        <button type="submit" className="bg-[#FF9408] text-white p-3 rounded font-bold hover:bg-orange-600 transition mt-2">
          {isRegister ? 'Зарегистрироваться' : 'Войти'}
        </button>
        <button 
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          className="text-gray-400 hover:text-white text-xs mt-2 text-center"
        >
          {isRegister ? 'Уже есть аккаунт? Войти' : 'Еще нет аккаунта? Зарегистрироваться'}
        </button>
      </form>
    </div>
  );
};

export default Login;