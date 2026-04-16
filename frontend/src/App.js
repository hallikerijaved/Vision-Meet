import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import OTPAuth from './pages/OTPAuth';
import Dashboard from './pages/Dashboard';
import MainDashboard from './pages/MainDashboard';
import CreateGD from './pages/CreateGD';
import BrowseGDs from './pages/BrowseGDs';
import MyGDs from './pages/MyGDs';
import GDRoom from './pages/GDRoom';
import AdminPanel from './pages/AdminPanel';
import JoinGD from './pages/JoinGD';
import ResetPassword from './pages/ResetPassword';
import RealTimeInterview from './pages/RealTimeInterview';
import Evaluations from './pages/Evaluations';
import Certificates from './pages/Certificates';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to={user?.email === 'admin@gd.com' ? "/admin" : "/dashboard"} />} />
        <Route path="/otp-login" element={!user ? <OTPAuth setUser={setUser} /> : <Navigate to={user?.email === 'admin@gd.com' ? "/admin" : "/dashboard"} />} />
        <Route path="/reset-password/:token" element={!user ? <ResetPassword /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={user && user.email !== 'admin@gd.com' ? <MainDashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/old-dashboard" element={user && user.email !== 'admin@gd.com' ? <Dashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/create-gd" element={user && user.email !== 'admin@gd.com' ? <CreateGD user={user} /> : <Navigate to="/login" />} />
        <Route path="/browse-gds" element={user && user.email !== 'admin@gd.com' ? <BrowseGDs user={user} /> : <Navigate to="/login" />} />
        <Route path="/my-gds" element={user && user.email !== 'admin@gd.com' ? <MyGDs user={user} /> : <Navigate to="/login" />} />
        <Route path="/interview" element={user && user.email !== 'admin@gd.com' ? <RealTimeInterview user={user} /> : <Navigate to="/login" />} />
        <Route path="/evaluations" element={user && user.email !== 'admin@gd.com' ? <Evaluations user={user} /> : <Navigate to="/login" />} />
        <Route path="/certificates" element={user && user.email !== 'admin@gd.com' ? <Certificates user={user} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user?.email === 'admin@gd.com' ? <AdminPanel user={user} /> : <Navigate to="/login" />} />
        <Route path="/room/:roomId" element={user ? <GDRoom user={user} /> : <Navigate to="/login" />} />
        <Route path="/join/:roomId" element={user ? <JoinGD user={user} /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={user ? (user.email === 'admin@gd.com' ? "/admin" : "/dashboard") : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;