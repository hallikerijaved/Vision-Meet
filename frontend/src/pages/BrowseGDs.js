import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gd } from '../utils/api';
import Navigation from '../components/Navigation';

const BrowseGDs = ({ user }) => {
  const [gds, setGds] = useState([]);
  const [filter, setFilter] = useState('all'); // all, active, my
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchGDs();
  }, []);

  const fetchGDs = async () => {
    try {
      const response = await gd.getAll();
      setGds(response.data);
    } catch (error) {
      console.error('Error fetching GDs:', error);
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

  const filteredGDs = gds.filter(gdItem => {
    const matchesSearch = gdItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         gdItem.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (filter) {
      case 'active':
        return matchesSearch && gdItem.isActive;
      case 'my':
        return matchesSearch && (gdItem.moderator._id === user.id || gdItem.participants.some(p => p._id === user.id));
      default:
        return matchesSearch;
    }
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navigation user={user} />
      <header style={{ background: 'white', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h1 style={{ margin: 0, color: '#333' }}>🔍 Browse Discussions</h1>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ padding: '0.75rem 1.5rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              ← Back to Dashboard
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search discussions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, minWidth: '300px', padding: '0.75rem', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '1rem' }}
            />
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ padding: '0.75rem', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '1rem' }}
            >
              <option value="all">All Discussions</option>
              <option value="active">Active Only</option>
              <option value="my">My Discussions</option>
            </select>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '1rem', color: '#666' }}>
          Found {filteredGDs.length} discussion{filteredGDs.length !== 1 ? 's' : ''}
        </div>

        {filteredGDs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '12px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
            <h3>No discussions found</h3>
            <p style={{ color: '#666' }}>Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {filteredGDs.map((gdItem) => (
              <div key={gdItem._id} style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, color: '#333', fontSize: '1.5rem' }}>{gdItem.title}</h3>
                      <span style={{
                        background: gdItem.isActive ? '#28a745' : '#6c757d',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}>
                        {gdItem.isActive ? 'ACTIVE' : 'ENDED'}
                      </span>
                    </div>
                    
                    <p style={{ color: '#666', margin: '0 0 1rem 0', fontSize: '1rem', lineHeight: '1.5' }}>
                      {gdItem.description || 'No description provided'}
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.9rem', color: '#888' }}>
                      <div>👤 <strong>Moderator:</strong> {gdItem.moderator.name}</div>
                      <div>👥 <strong>Participants:</strong> {gdItem.participants.length}/{gdItem.maxParticipants}</div>
                      <div>🕒 <strong>Created:</strong> {new Date(gdItem.createdAt).toLocaleString()}</div>
                      <div>📊 <strong>Status:</strong> {gdItem.isActive ? 'Live Discussion' : 'Discussion Ended'}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '2rem' }}>
                    {gdItem.isActive ? (
                      <>
                        <button
                          onClick={() => handleJoinGD(gdItem._id, gdItem.roomId)}
                          disabled={gdItem.participants.length >= gdItem.maxParticipants}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: gdItem.participants.length >= gdItem.maxParticipants ? '#ccc' : '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: gdItem.participants.length >= gdItem.maxParticipants ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            minWidth: '120px'
                          }}
                        >
                          {gdItem.participants.length >= gdItem.maxParticipants ? 'Full' : 'Join Now'}
                        </button>
                        
                        <button
                          onClick={() => {
                            const shareLink = `${window.location.origin}/join/${gdItem.roomId}`;
                            navigator.clipboard.writeText(shareLink);
                            alert('Share link copied to clipboard!');
                          }}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          📋 Share
                        </button>
                      </>
                    ) : (
                      <div style={{ padding: '0.75rem 1.5rem', background: '#f8f9fa', color: '#666', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                        Discussion Ended
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

export default BrowseGDs;