import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gd } from '../utils/api';
import Navigation from '../components/Navigation';

const CreateGD = ({ user }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    maxParticipants: 10
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await gd.create(formData);
      navigate(`/room/${response.data.roomId}`);
    } catch (error) {
      console.error('Error creating GD:', error);
      alert('Error creating GD. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navigation user={user} />
      <div style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ color: '#333', marginBottom: '0.5rem' }}>🚀 Start New Group Discussion</h1>
            <p style={{ color: '#666' }}>Create an engaging discussion for your participants</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#333' }}>
                Discussion Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Future of Artificial Intelligence"
                style={{ width: '100%', padding: '1rem', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '1rem' }}
                required
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#333' }}>
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide context or guidelines for the discussion..."
                style={{ width: '100%', padding: '1rem', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '1rem', minHeight: '100px', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#333' }}>
                Maximum Participants
              </label>
              <select
                value={formData.maxParticipants}
                onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '1rem', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '1rem' }}
              >
                <option value={5}>5 participants</option>
                <option value={10}>10 participants</option>
                <option value={15}>15 participants</option>
                <option value={20}>20 participants</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                disabled={loading || !formData.title.trim()}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: loading || !formData.title.trim() ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: loading || !formData.title.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Creating...' : '🚀 Create & Start GD'}
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                style={{ padding: '1rem 2rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </form>

          <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', fontSize: '0.9rem', color: '#666' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>💡 Tips for a Great Discussion:</h4>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              <li>Choose a clear, engaging title</li>
              <li>Provide context in the description</li>
              <li>Set appropriate participant limits</li>
              <li>Be ready to moderate the discussion</li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default CreateGD;