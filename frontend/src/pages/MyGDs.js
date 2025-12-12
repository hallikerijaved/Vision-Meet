import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gd } from '../utils/api';
import Navigation from '../components/Navigation';

const MyGDs = ({ user }) => {
  const [myGDs, setMyGDs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyGDs();
  }, []);

  const fetchMyGDs = async () => {
    try {
      const response = await gd.getAll();
      const filtered = response.data.filter(gdItem => 
        gdItem.moderator._id === user.id || gdItem.participants.some(p => p._id === user.id)
      );
      setMyGDs(filtered);
    } catch (error) {
      console.error('Error fetching my GDs:', error);
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

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navigation user={user} />
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 1rem 0', color: '#333' }}>📋 My Discussions</h1>
          <p style={{ color: '#666', margin: 0 }}>Discussions you've created or participated in</p>
        </div>

        {myGDs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '12px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💬</div>
            <h3>No discussions yet</h3>
            <p style={{ color: '#666', marginBottom: '2rem' }}>Start your first group discussion!</p>
            <button
              onClick={() => navigate('/create-gd')}
              style={{ padding: '1rem 2rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
            >
              🚀 Create First GD
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {myGDs.map((gdItem) => (
              <div key={gdItem._id} style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, color: '#333' }}>{gdItem.title}</h3>
                      <span style={{
                        background: gdItem.isActive ? '#28a745' : '#6c757d',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem'
                      }}>
                        {gdItem.isActive ? 'ACTIVE' : 'ENDED'}
                      </span>
                      {gdItem.moderator._id === user.id && (
                        <span style={{ background: '#ffc107', color: '#000', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem' }}>
                          MODERATOR
                        </span>
                      )}
                    </div>
                    
                    <p style={{ color: '#666', margin: '0 0 1rem 0' }}>
                      {gdItem.description || 'No description provided'}
                    </p>
                    
                    <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', color: '#888' }}>
                      <span>👥 {gdItem.participants.length}/{gdItem.maxParticipants} participants</span>
                      <span>🕒 {new Date(gdItem.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div style={{ marginLeft: '2rem' }}>
                    {gdItem.isActive ? (
                      <button
                        onClick={() => handleJoinGD(gdItem._id, gdItem.roomId)}
                        style={{ padding: '0.75rem 1.5rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Rejoin
                      </button>
                    ) : (
                      <div style={{ padding: '0.75rem 1.5rem', background: '#f8f9fa', color: '#666', borderRadius: '8px', textAlign: 'center' }}>
                        Ended
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyGDs;