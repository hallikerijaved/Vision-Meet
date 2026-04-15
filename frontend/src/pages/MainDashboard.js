import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gd } from '../utils/api';
import Navigation from '../components/Navigation';

const MainDashboard = ({ user }) => {
  const [stats, setStats] = useState({
    activeGDs: 0,
    totalParticipants: 0,
    myGDs: 0,
    recentGDs: []
  });
  const [gds, setGds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await gd.getAll();
      const allGDs = response.data;
      
      const activeGDs = allGDs.filter(gd => gd.isActive);
      const myGDs = allGDs.filter(gd => 
        gd.moderator._id === user.id || gd.participants.some(p => p._id === user.id)
      );
      
      const totalParticipants = activeGDs.reduce((sum, gd) => sum + gd.participants.length, 0);
      
      setStats({
        activeGDs: activeGDs.length,
        totalParticipants,
        myGDs: myGDs.length,
        recentGDs: allGDs.slice(0, 5)
      });
      
      setGds(activeGDs);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleJoinGD = async (gdId, roomId) => {
    try {
      await gd.join(gdId);
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('Error joining GD:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navigation user={user} />
      
      {/* Hero Section */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '3rem 2rem', color: 'white', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '3rem', fontWeight: 'bold' }}>Welcome to GD Platform</h1>
        <p style={{ margin: '1rem 0 0 0', fontSize: '1.2rem', opacity: 0.9 }}>Connect, Discuss, and Collaborate in Real-time</p>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎯</div>
            <h3 style={{ margin: 0, color: '#333', fontSize: '2rem' }}>{stats.activeGDs}</h3>
            <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>Active Discussions</p>
          </div>
          
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👥</div>
            <h3 style={{ margin: 0, color: '#333', fontSize: '2rem' }}>{stats.totalParticipants}</h3>
            <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>Total Participants</p>
          </div>
          
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📊</div>
            <h3 style={{ margin: 0, color: '#333', fontSize: '2rem' }}>{stats.myGDs}</h3>
            <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>My Discussions</p>
          </div>
          
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚡</div>
            <h3 style={{ margin: 0, color: '#333', fontSize: '2rem' }}>Live</h3>
            <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>Real-time Updates</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 1.5rem 0', color: '#333' }}>Quick Actions</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/create-gd')}
              style={{ padding: '1rem 2rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
            >
              🚀 Start New GD
            </button>
            <button
              onClick={() => navigate('/interview')}
              style={{ padding: '1rem 2rem', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
            >
              💬 AI Mock Interview
            </button>
            <button
              onClick={() => navigate('/my-gds')}
              style={{ padding: '1rem 2rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
            >
              📋 My Discussions
            </button>
            <button
              onClick={() => navigate('/browse-gds')}
              style={{ padding: '1rem 2rem', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
            >
              🔍 Browse All GDs
            </button>
          </div>
        </div>

        {/* Active Discussions */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color: '#333' }}>🔥 Trending Discussions</h2>
            <span style={{ background: '#e9ecef', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.9rem', color: '#666' }}>
              {stats.activeGDs} Active Now
            </span>
          </div>
          
          {gds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💬</div>
              <h3>No active discussions</h3>
              <p>Be the first to start a group discussion!</p>
              <button
                onClick={() => navigate('/create-gd')}
                style={{ padding: '0.75rem 1.5rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '1rem' }}
              >
                Start First GD
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {gds.map((gdItem) => (
                <div key={gdItem._id} style={{ border: '1px solid #e9ecef', borderRadius: '8px', padding: '1.5rem', transition: 'all 0.3s ease', cursor: 'pointer' }}
                     onMouseEnter={(e) => e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
                     onMouseLeave={(e) => e.target.style.boxShadow = 'none'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0, color: '#333' }}>{gdItem.title}</h3>
                        <span style={{ background: '#28a745', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem' }}>
                          LIVE
                        </span>
                      </div>
                      <p style={{ color: '#666', margin: '0.5rem 0', fontSize: '0.9rem' }}>
                        {gdItem.description || 'Join the discussion and share your thoughts!'}
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#888' }}>
                        <span>👤 {gdItem.moderator.name}</span>
                        <span>👥 {gdItem.participants.length}/{gdItem.maxParticipants}</span>
                        <span>🕒 {new Date(gdItem.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                      <button
                        onClick={() => handleJoinGD(gdItem._id, gdItem.roomId)}
                        disabled={gdItem.participants.length >= gdItem.maxParticipants}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: gdItem.participants.length >= gdItem.maxParticipants ? '#ccc' : '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: gdItem.participants.length >= gdItem.maxParticipants ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {gdItem.participants.length >= gdItem.maxParticipants ? 'Full' : 'Join Now'}
                      </button>
                      <button
                        onClick={() => {
                          const shareLink = `${window.location.origin}/join/${gdItem.roomId}`;
                          navigator.clipboard.writeText(shareLink);
                          alert('Share link copied!');
                        }}
                        style={{ padding: '0.75rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        📋
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;