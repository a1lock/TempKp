import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Profile = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // очищает localStorage и сбрасывает user в контексте
    navigate('/');
  };

  // не рендерим страницу если пользователь не залогинен (ProtectedRoute должен это предотвращать)
  if (!user) return null;

  return (
    <div className="max-w-[1440px] mx-auto p-6 flex flex-col min-h-[80vh] justify-between">
      <div className="max-w-md mx-auto w-full mt-12">
        <h2 className="text-white text-3xl font-bold mb-8 text-center">Профиль пользователя</h2>
        <section className="bg-[#1A1B23] p-8 rounded-xl border border-gray-800 flex flex-col gap-6">
          <div>
            <span className="text-gray-400 text-xs block mb-1">Email учетной записи</span>
            <span className="text-white text-lg font-medium">{user.email}</span>
          </div>
          <button onClick={handleLogout} className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold transition mt-4">
            Выйти из аккаунта
          </button>
        </section>
      </div>

      <footer className="flex justify-between items-center py-6 border-t border-gray-800 text-gray-500 text-xs mt-12">
        <span>SteamS&C</span>
        <span>disclaimer - API source - © 2026</span>
      </footer>
    </div>
  );
};

export default Profile;