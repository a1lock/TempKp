import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Market from './pages/Market';
import SetBuilder from './pages/SetBuilder';
import TradeUp from './pages/TradeUp';
import Admin from './pages/Admin';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0B0C10] font-sans flex flex-col">
          <Navbar />
          <div className="flex-1">
            <Routes>
              {/* публичные роуты */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/market" element={<Market />} />
              
              {/* закрытые роуты для авторизованных */}
              <Route element={<ProtectedRoute />}>
                <Route path="/builder" element={<SetBuilder />} />
                <Route path="/tradeup" element={<TradeUp />} />
              </Route>

              {/* скрытый роут только для роли admin */}
              <Route element={<ProtectedRoute adminOnly={true} />}>
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}