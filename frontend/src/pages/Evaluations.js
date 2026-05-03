import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const Evaluations = ({ user }) => {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/evaluation/my-evaluations`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setEvaluations(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user, navigate]);

  const getColor = (score) => score >= 75 ? '#28a745' : score >= 60 ? '#ffc107' : '#dc3545';
  const getLabel = (score) => score >= 75 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Improvement';

  if (loading) return <div><Navigation user={user} /><div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div></div>;

  return (
    <div>
      <Navigation user={user} />
      <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <h1>📊 My GD Evaluations</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>AI-powered communication scores with blockchain certificates</p>

        {evaluations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3>No evaluations yet</h3>
            <p style={{ color: '#666', marginBottom: '1rem' }}>Join a GD session and participate to get your AI score</p>
            <button onClick={() => navigate('/dashboard')}
              style={{ padding: '0.75rem 1.5rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Browse GD Sessions
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {evaluations.map((ev) => (
              <div key={ev._id} style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{ev.gdTitle}</h3>
                    <p style={{ color: '#666', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>{new Date(ev.createdAt).toLocaleString()}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: getColor(ev.scores.totalScore) }}>{ev.scores.totalScore}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>{getLabel(ev.scores.totalScore)}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                  {[['Clarity', ev.scores.clarity, '#e3f2fd'], ['Relevance', ev.scores.relevance, '#e8f5e9'], ['Engagement', ev.scores.engagement, '#fff3e0'], ['Professionalism', ev.scores.professionalism, '#fce4ec']].map(([label, val, bg]) => (
                    <div key={label} style={{ padding: '0.75rem', background: bg, borderRadius: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>{label}</div>
                      <div style={{ fontWeight: 'bold' }}>{val}/25</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#f8f9fa', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  {ev.feedback}
                </div>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#666', marginBottom: ev.blockchainCertificate ? '1rem' : 0 }}>
                  <span>💬 {ev.messageCount} messages</span>
                </div>

                {ev.blockchainCertificate && (
                  <div style={{ padding: '0.75rem', background: '#d4edda', borderRadius: '4px', border: '1px solid #c3e6cb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>🏆 Blockchain Certificate</strong>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>ID: {ev.blockchainCertificate.certificateId}</p>
                    </div>
                    <button onClick={() => navigate('/certificates')}
                      style={{ padding: '0.5rem 1rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      View
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Evaluations;
