import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Market from './pages/Market';
import TradeUp from './pages/TradeUp';
import './App.css';

// навигационная панель
const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-[#16171D] h-20 flex items-center px-8 justify-between">
      <div className="text-white font-bold text-xl">
        SteamS<span className="text-[#FF9408]">&</span>C
      </div>
      <nav className="flex gap-8 text-gray-300 font-medium">
        <Link to="/market" className="hover:text-white transition">Маркет</Link>
        {user && <Link to="/tradeup" className="hover:text-white transition">Контракты</Link>}
      </nav>
      <div>
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{user.email}</span>
            <button onClick={handleLogout} className="text-red-400 hover:text-red-300 text-sm">Выйти</button>
          </div>
        ) : (
          <Link to="/" className="bg-[#5EADFF] text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-500 transition">
            Войти
          </Link>
        )}
      </div>
    </header>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0B0C10] font-sans">
          <Navbar />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/market" element={<Market />} />
            <Route path="/tradeup" element={<TradeUp />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}