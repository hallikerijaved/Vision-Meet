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
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
      padding: '0 2rem',
      position: 'sticky', top: 0, zIndex: 1000,
      boxShadow: '0 4px 20px rgba(79,70,229,0.3)'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
        
        {/* Logo */}
        <div onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', textDecoration: 'none' }}>
          <span style={{ color: 'white', fontWeight: '800', fontSize: '1.25rem', letterSpacing: '-0.02em' }}>Vision<span style={{ color: '#a78bfa' }}>Meet</span></span>
        </div>

        {/* Nav Items */}
        <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto' }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button key={item.path} onClick={() => navigate(item.path)} style={{
                padding: '0.45rem 0.85rem',
                background: active ? 'rgba(167,139,250,0.2)' : 'transparent',
                color: active ? '#a78bfa' : 'rgba(255,255,255,0.7)',
                border: active ? '1px solid rgba(167,139,250,0.4)' : '1px solid transparent',
                borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: active ? '600' : '400',
                whiteSpace: 'nowrap', transition: 'all 0.2s'
              }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white'; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* User + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div onClick={() => navigate('/profile')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.3rem 0.6rem', borderRadius: '8px', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #818cf8, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '0.9rem' }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', fontWeight: '500' }}>{user.name}</span>
          </div>
          <button onClick={logout} style={{
            padding: '0.4rem 1rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5',
            border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s'
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#fca5a5'; }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;