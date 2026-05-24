import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import './App.css';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Market from './pages/Market';
import SetBuilder from './pages/SetBuilder';
import TradeUp from './pages/TradeUp';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0B0C10] flex flex-col justify-between">
          <div className="flex-col flex-1">
            <Navbar />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/market" element={<Market />} />
              
              <Route element={<ProtectedRoute />}>
                <Route path="/builder" element={<SetBuilder />} />
                <Route path="/tradeup" element={<TradeUp />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              <Route element={<ProtectedRoute adminOnly={true} />}>
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;