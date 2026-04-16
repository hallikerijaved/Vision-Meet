import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Navigation = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: '🏠 Dashboard' },
    { path: '/create-gd', label: '🚀 Start GD' },
    { path: '/interview', label: '💬 AI Interview' },
    { path: '/browse-gds', label: '🔍 Browse' },
    { path: '/my-gds', label: '📋 My GDs' },
    { path: '/evaluations', label: '📊 Evaluations' },
    { path: '/certificates', label: '🏆 Certificates' }
  ];

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  return (
    <nav style={{ 
      background: 'white', 
      padding: '1rem 2rem', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h2 
            onClick={() => navigate('/dashboard')}
            style={{ margin: 0, color: '#333', cursor: 'pointer', fontSize: '1.5rem' }}
          >
            GD Platform
          </h2>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  padding: '0.5rem 1rem',
                  background: location.pathname === item.path ? '#007bff' : 'transparent',
                  color: location.pathname === item.path ? 'white' : '#666',
                  border: '1px solid #e9ecef',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== item.path) {
                    e.target.style.background = '#f8f9fa';
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== item.path) {
                    e.target.style.background = 'transparent';
                  }
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#666' }}>Welcome, {user.name}</span>
          <button
            onClick={logout}
            style={{ 
              padding: '0.5rem 1rem', 
              background: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer' 
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;