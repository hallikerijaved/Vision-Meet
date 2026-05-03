import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gd } from '../utils/api';
import Navigation from '../components/Navigation';

const StatCard = ({ icon, value, label, color }) => (
  <div style={{
    background: 'white', borderRadius: '16px', padding: '1.5rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)', display: 'flex',
    alignItems: 'center', gap: '1rem', borderLeft: `4px solid ${color}`
  }}>
    <div style={{ fontSize: '2.2rem', background: `${color}18`, borderRadius: '12px', padding: '0.6rem', lineHeight: 1 }}>{icon}</div>
    <div>
      <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#1a1a2e', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>{label}</div>
    </div>
  </div>
);

const ActionBtn = ({ icon, label, onClick, color }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    padding: '0.85rem 1.4rem', background: color, color: 'white',
    border: 'none', borderRadius: '10px', cursor: 'pointer',
    fontSize: '0.95rem', fontWeight: '600',
    boxShadow: `0 4px 12px ${color}55`, transition: 'transform 0.15s, box-shadow 0.15s'
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 16px ${color}77`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 12px ${color}55`; }}
  >
    <span style={{ fontSize: '1.1rem' }}>{icon}</span> {label}
  </button>
);

const MainDashboard = ({ user }) => {
  const [gds, setGds] = useState([]);
  const [stats, setStats] = useState({ activeGDs: 0, totalParticipants: 0, myGDs: 0 });
  const [joiningId, setJoiningId] = useState(null);
  const [joinError, setJoinError] = useState('');
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const res = await gd.getAll();
      const all = res.data;
      const active = all.filter(g => g.isActive);
      const myGDs = all.filter(g => g.moderator._id === user.id || g.participants.some(p => p._id === user.id));
      setGds(active);
      setStats({
        activeGDs: active.length,
        totalParticipants: active.reduce((s, g) => s + g.participants.length, 0),
        myGDs: myGDs.length
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    const keepAlive = setInterval(() => {
      fetch(`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001'}/health`).catch(() => {});
    }, 4 * 60 * 1000);
    return () => { clearInterval(interval); clearInterval(keepAlive); };
  }, [fetchData]);

  const handleJoin = async (gdId, roomId) => {
    setJoiningId(gdId); setJoinError('');
    try {
      await gd.join(gdId);
      navigate(`/room/${roomId}`);
    } catch (e) {
      setJoinError(e.response?.data?.message || 'Failed to join. Please try again.');
      setJoiningId(null);
    }
  };

  const handleCopy = (roomId) => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${roomId}`);
    setCopied(roomId);
    setTimeout(() => setCopied(''), 2000);
  };

  const timeAgo = (date) => {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const fillPct = (g) => Math.round((g.participants.length / g.maxParticipants) * 100);

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', fontFamily: "'Segoe UI', sans-serif" }}>
      <Navigation user={user} />

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)',
        padding: '3rem 2rem 5rem', color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '220px', height: '220px', background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '160px', height: '160px', background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '900', letterSpacing: '-0.03em' }}>Vision<span style={{ color: '#a78bfa' }}>Meet</span></span>
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', fontWeight: '600', opacity: 0.9 }}>
            Welcome back, {user.name} 👋
          </h1>
          <p style={{ margin: '0.75rem 0 0', opacity: 0.75, fontSize: '1rem' }}>
            Ready to discuss? {stats.activeGDs} live session{stats.activeGDs !== 1 ? 's' : ''} happening now.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '-2.5rem auto 0', padding: '0 1.5rem 3rem', position: 'relative' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          <StatCard icon="🎯" value={stats.activeGDs} label="Active Discussions" color="#4f46e5" />
          <StatCard icon="👥" value={stats.totalParticipants} label="Live Participants" color="#059669" />
          <StatCard icon="📋" value={stats.myGDs} label="My Discussions" color="#d97706" />
          <StatCard icon="⚡" value="Live" label="Real-time Updates" color="#7c3aed" />
        </div>

        {/* Quick Actions */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '1.75rem' }}>
          <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', color: '#374151', fontWeight: '700' }}>Quick Actions</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <ActionBtn icon="🚀" label="Start New GD" onClick={() => navigate('/create-gd')} color="#4f46e5" />
            <ActionBtn icon="🤖" label="AI Mock Interview" onClick={() => navigate('/interview')} color="#e11d48" />
            <ActionBtn icon="📋" label="My Discussions" onClick={() => navigate('/my-gds')} color="#0891b2" />
            <ActionBtn icon="🔍" label="Browse All GDs" onClick={() => navigate('/browse-gds')} color="#059669" />
          </div>
        </div>

        {/* Live Discussions */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#374151', fontWeight: '700' }}>
              🔥 Live Discussions
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{stats.activeGDs} active now</span>
            </div>
          </div>

          {joinError && (
            <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              ❌ {joinError}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              Loading discussions...
            </div>
          ) : gds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>💬</div>
              <h3 style={{ color: '#374151', margin: '0 0 0.5rem' }}>No active discussions</h3>
              <p style={{ color: '#9ca3af', margin: '0 0 1.5rem' }}>Be the first to start one!</p>
              <ActionBtn icon="🚀" label="Start First GD" onClick={() => navigate('/create-gd')} color="#4f46e5" />
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              {gds.map((g) => {
                const full = g.participants.length >= g.maxParticipants;
                const pct = fillPct(g);
                return (
                  <div key={g._id} style={{
                    border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem',
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                    background: full ? '#fafafa' : 'white'
                  }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(79,70,229,0.12)'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: '1rem', color: '#1f2937', fontWeight: '700' }}>{g.title}</h3>
                          <span style={{ background: full ? '#fee2e2' : '#dcfce7', color: full ? '#dc2626' : '#16a34a', padding: '0.15rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700' }}>
                            {full ? 'FULL' : 'LIVE'}
                          </span>
                        </div>
                        <p style={{ color: '#6b7280', margin: '0 0 0.75rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
                          {g.description || 'Join the discussion and share your thoughts!'}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#9ca3af', flexWrap: 'wrap' }}>
                          <span>👤 {g.moderator.name}</span>
                          <span>👥 {g.participants.length}/{g.maxParticipants}</span>
                          <span>🕒 {timeAgo(g.createdAt)}</span>
                        </div>
                        {/* Fill bar */}
                        <div style={{ marginTop: '0.75rem', background: '#f3f4f6', borderRadius: '99px', height: '5px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e', borderRadius: '99px', transition: 'width 0.4s' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={() => handleJoin(g._id, g.roomId)}
                          disabled={full || joiningId === g._id}
                          style={{
                            padding: '0.65rem 1.25rem', fontWeight: '700', fontSize: '0.9rem',
                            background: full ? '#e5e7eb' : joiningId === g._id ? '#818cf8' : '#4f46e5',
                            color: full ? '#9ca3af' : 'white', border: 'none', borderRadius: '8px',
                            cursor: full || joiningId === g._id ? 'not-allowed' : 'pointer',
                            transition: 'background 0.2s'
                          }}
                        >
                          {joiningId === g._id ? 'Joining...' : full ? 'Full' : 'Join Now'}
                        </button>
                        <button
                          onClick={() => handleCopy(g.roomId)}
                          title="Copy share link"
                          style={{ padding: '0.65rem 0.85rem', background: copied === g.roomId ? '#dcfce7' : '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', transition: 'background 0.2s' }}
                        >
                          {copied === g.roomId ? '✅' : '📋'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: 'rgba(255,255,255,0.7)', padding: '2.5rem 2rem 1.5rem', marginTop: '2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <span style={{ color: 'white', fontWeight: '800', fontSize: '1.1rem' }}>Vision<span style={{ color: '#a78bfa' }}>Meet</span></span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6 }}>Real-time group discussions with video conferencing, AI interviews, and smart evaluations.</p>
            </div>
            <div>
              <h4 style={{ color: 'white', margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Quick Links</h4>
              {[['🚀 Start GD', '/create-gd'], ['🔍 Browse GDs', '/browse-gds'], ['📋 My GDs', '/my-gds'], ['🤖 AI Interview', '/interview']].map(([label, path]) => (
                <div key={path} onClick={() => navigate(path)} style={{ cursor: 'pointer', fontSize: '0.85rem', marginBottom: '0.4rem', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'white'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>
                  {label}
                </div>
              ))}
            </div>
            <div>
              <h4 style={{ color: 'white', margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Features</h4>
              {['🎥 Video Conferencing', '💬 Real-time Chat', '🤖 AI Evaluation', '🏆 Certificates'].map(f => (
                <div key={f} style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>{f}</div>
              ))}
            </div>
            <div>
              <h4 style={{ color: 'white', margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Status</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
                Backend Online
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
                MongoDB Connected
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
                WebRTC Ready
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem' }}>© {new Date().getFullYear()} VisionMeet. All rights reserved.</span>
            <span style={{ fontSize: '0.8rem' }}>Built with ⚡ React · Node.js · WebRTC · MongoDB</span>
          </div>
        </div>
      </footer>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
};

export default MainDashboard;
