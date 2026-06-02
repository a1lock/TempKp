import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Navbar = () => {
  const { user } = useContext(AuthContext);
  // menuOpen управляет видимостью мобильного меню
  const [menuOpen, setMenuOpen] = useState(false);

  // закрываем меню при переходе по ссылке
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="bg-[#16171D] border-b border-gray-800 relative">
      <div className="h-20 flex items-center px-6 justify-between">
        <Link to="/" className="text-white font-bold text-xl tracking-wider shrink-0">
          SteamS<span className="text-[#FF9408]">&</span>C
        </Link>

        {/* desktop nav */}
        <nav className="hidden md:flex gap-8 text-gray-300 font-medium">
          <Link to="/market" className="hover:text-white transition">Market</Link>
          {user && <Link to="/builder" className="hover:text-white transition">Set builder</Link>}
          {user && <Link to="/tradeup" className="hover:text-white transition">Trade-up</Link>}
          {user?.role === 'admin' && (
            <Link to="/admin" className="text-red-400 hover:text-red-300 transition">Админ-панель</Link>
          )}
        </nav>

        <div className="hidden md:block shrink-0">
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

        {/* hamburger */}
        <button
          className="md:hidden flex flex-col justify-center gap-1.5 p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Меню"
        >
          <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#16171D] border-t border-gray-800 px-6 py-4 flex flex-col gap-1">
          <Link to="/market" onClick={closeMenu} className="text-gray-300 hover:text-white transition py-3 border-b border-gray-800/50">Market</Link>
          {user && (
            <Link to="/builder" onClick={closeMenu} className="text-gray-300 hover:text-white transition py-3 border-b border-gray-800/50">Set builder</Link>
          )}
          {user && (
            <Link to="/tradeup" onClick={closeMenu} className="text-gray-300 hover:text-white transition py-3 border-b border-gray-800/50">Trade-up</Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" onClick={closeMenu} className="text-red-400 hover:text-red-300 transition py-3 border-b border-gray-800/50">Админ-панель</Link>
          )}
          <div className="pt-3">
            {user ? (
              <Link to="/profile" onClick={closeMenu} className="inline-block bg-[#2A2B35] text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-700 transition border border-gray-700">
                Профиль
              </Link>
            ) : (
              <Link to="/login" onClick={closeMenu} className="inline-block bg-[#5EADFF] text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-500 transition">
                Login via Steam
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
