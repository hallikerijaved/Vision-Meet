import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gd } from '../utils/api';

const Dashboard = ({ user }) => {
  const [gds, setGds] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGD, setNewGD] = useState({ title: '', description: '', maxParticipants: 10 });
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

  const handleCreateGD = async (e) => {
    e.preventDefault();
    try {
      const response = await gd.create(newGD);
      navigate(`/room/${response.data.roomId}`);
    } catch (error) {
      console.error('Error creating GD:', error);
    }
  };

  const handleJoinGD = async (gdId, roomId) => {
    try {
      await gd.join(gdId);
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('Error joining GD:', error);
      alert(`Failed to join GD: ${error.response?.data?.message || error.message}`);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#333' }}>GD Platform Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Welcome, {user.name}</span>
          <button onClick={logout} style={{ padding: '0.5rem 1rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </header>

      <main style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Active Group Discussions</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{ padding: '0.75rem 1.5rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Start New GD
          </button>
        </div>

        {showCreateForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', width: '400px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Create New GD</h3>
              <form onSubmit={handleCreateGD}>
                <input
                  type="text"
                  placeholder="GD Title"
                  value={newGD.title}
                  onChange={(e) => setNewGD({ ...newGD, title: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newGD.description}
                  onChange={(e) => setNewGD({ ...newGD, description: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px', minHeight: '80px' }}
                />
                <input
                  type="number"
                  placeholder="Max Participants"
                  value={newGD.maxParticipants}
                  onChange={(e) => setNewGD({ ...newGD, maxParticipants: parseInt(e.target.value) })}
                  style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  min="2"
                  max="20"
                />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '0.75rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Create & Join
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    style={{ flex: 1, padding: '0.75rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {gds.map((gdItem) => (
            <div key={gdItem._id} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginBottom: '0.5rem', color: '#333' }}>{gdItem.title}</h3>
              <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>{gdItem.description || 'No description'}</p>
              <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1rem' }}>
                <div>Moderator: {gdItem.moderator.name}</div>
                <div>Participants: {gdItem.participants.length}/{gdItem.maxParticipants}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleJoinGD(gdItem._id, gdItem.roomId)}
                  disabled={gdItem.participants.length >= gdItem.maxParticipants}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: gdItem.participants.length >= gdItem.maxParticipants ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: gdItem.participants.length >= gdItem.maxParticipants ? 'not-allowed' : 'pointer'
                  }}
                >
                  {gdItem.participants.length >= gdItem.maxParticipants ? 'Full' : 'Join GD'}
                </button>
                <button
                  onClick={() => {
                    const shareLink = `${window.location.origin}/join/${gdItem.roomId}`;
                    navigator.clipboard.writeText(shareLink);
                    alert('Share link copied to clipboard!');
                  }}
                  style={{
                    padding: '0.75rem',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  📋 Share
                </button>
              </div>
            </div>
          ))}
        </div>

        {gds.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            <h3>No active group discussions</h3>
            <p>Start a new GD to begin the conversation!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;