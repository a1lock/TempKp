import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const ProtectedRoute = ({ adminOnly = false }: { adminOnly?: boolean }) => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // проверка прав доступа для админки
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/market" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;