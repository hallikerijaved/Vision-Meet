import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gd } from '../utils/api';

const JoinGD = ({ user }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gdInfo, setGdInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const findAndJoinGD = async () => {
      try {
        const response = await gd.getAll();
        const targetGD = response.data.find(gdItem => gdItem.roomId === roomId && gdItem.isActive);
        
        if (!targetGD) {
          setError('GD session not found or has ended');
          setLoading(false);
          return;
        }

        setGdInfo(targetGD);
        setLoading(false);
      } catch (error) {
        setError('Error loading GD session');
        setLoading(false);
      }
    };

    findAndJoinGD();
  }, [roomId]);

  const handleJoin = async () => {
    try {
      await gd.join(gdInfo._id);
      navigate(`/room/${roomId}`);
    } catch (error) {
      setError(error.response?.data?.message || 'Error joining GD');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>Session Not Available</h2>
          <p style={{ marginBottom: '2rem' }}>{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ padding: '0.75rem 1.5rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center', maxWidth: '500px' }}>
        <h2 style={{ marginBottom: '1rem' }}>Join Group Discussion</h2>
        <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>{gdInfo.title}</h3>
          <p style={{ color: '#666', marginBottom: '1rem' }}>{gdInfo.description || 'No description'}</p>
          <div style={{ fontSize: '0.9rem', color: '#888' }}>
            <div>Moderator: {gdInfo.moderator.name}</div>
            <div>Participants: {gdInfo.participants.length}/{gdInfo.maxParticipants}</div>
          </div>
        </div>
        
        {gdInfo.participants.length >= gdInfo.maxParticipants ? (
          <div>
            <p style={{ color: '#dc3545', marginBottom: '1rem' }}>This session is full</p>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ padding: '0.75rem 1.5rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={handleJoin}
              style={{ padding: '0.75rem 1.5rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Join Discussion
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ padding: '0.75rem 1.5rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinGD;