import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Navbar = () => {
  const { user } = useContext(AuthContext);

  return (
    <header className="bg-[#16171D] h-20 flex items-center px-8 justify-between border-b border-gray-800">
      <Link to="/" className="text-white font-bold text-xl tracking-wider">
        SteamS<span className="text-[#FF9408]">&</span>C
      </Link>
      <nav className="flex gap-8 text-gray-300 font-medium">
        <Link to="/market" className="hover:text-white transition">Market</Link>
        {user && <Link to="/builder" className="hover:text-white transition">Set builder</Link>}
        {user && <Link to="/tradeup" className="hover:text-white transition">Trade-up</Link>}
        {user?.role === 'admin' && <Link to="/admin" className="text-red-400 hover:text-red-300 transition">Админ-панель</Link>}
      </nav>
      <div>
        {user ? (
          <Link to="/profile" className="bg-[#2A2B35] text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-700 transition border border-gray-700">
            Профиль
          </Link>
        ) : (
          <Link to="/login" className="bg-[#5EADFF] text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-500 transition">
            Login via Steam
          </Link>
        )}
      </div>
    </header>
  );
};

export default Navbar;