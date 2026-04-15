import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navigation from '../components/Navigation';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function Certificates({ user }) {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/blockchain/my-certificates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCertificates(res.data.certificates);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      setLoading(false);
    }
  };

  const verifyCertificate = async (certificateId) => {
    setVerifying(certificateId);
    try {
      const res = await axios.get(`${API_URL}/blockchain/verify-certificate/${certificateId}`);
      setVerificationResult(res.data);
      setTimeout(() => setVerificationResult(null), 5000);
    } catch (error) {
      setVerificationResult({ valid: false, message: 'Verification failed' });
      setTimeout(() => setVerificationResult(null), 5000);
    }
    setVerifying(null);
  };

  const downloadCertificate = (cert) => {
    const certificateText = `
BLOCKCHAIN CERTIFICATE OF COMPLETION

Certificate ID: ${cert.certificate.certificateId}
Name: ${cert.certificate.userName}
Role: ${cert.certificate.role}
Difficulty: ${cert.certificate.difficulty}
Score: ${cert.certificate.score}/10
Date: ${new Date(cert.certificate.date).toLocaleDateString()}

Blockchain Verification:
Block Hash: ${cert.blockHash}
Block Index: ${cert.blockIndex}

This certificate is secured on blockchain and can be verified at:
${window.location.origin}/verify/${cert.certificate.certificateId}
    `;

    const blob = new Blob([certificateText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certificate_${cert.certificate.certificateId}.txt`;
    a.click();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navigation user={user} />
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ background: 'white', borderRadius: '15px', padding: '40px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '30px', color: '#333' }}>🏆 My Blockchain Certificates</h1>

          {verificationResult && (
            <div style={{
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              background: verificationResult.valid ? '#d4edda' : '#f8d7da',
              border: `2px solid ${verificationResult.valid ? '#28a745' : '#dc3545'}`,
              color: verificationResult.valid ? '#155724' : '#721c24'
            }}>
              <strong>{verificationResult.valid ? '✅ Certificate Verified!' : '❌ Verification Failed'}</strong>
              {verificationResult.valid && (
                <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                  Blockchain Valid: {verificationResult.chainValid ? 'Yes' : 'No'}
                </p>
              )}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>Loading certificates...</p>
            </div>
          ) : certificates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>📜</div>
              <h3>No Certificates Yet</h3>
              <p>Complete interviews to earn blockchain-verified certificates!</p>
              <button
                onClick={() => navigate('/interview')}
                style={{
                  marginTop: '20px',
                  padding: '12px 24px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Start Interview
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {certificates.map((cert, idx) => (
                <div key={idx} style={{
                  border: '2px solid #667eea',
                  borderRadius: '12px',
                  padding: '25px',
                  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                  position: 'relative'
                }}>
                  <div style={{ position: 'absolute', top: '15px', right: '15px', background: '#28a745', color: 'white', padding: '5px 15px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                    ⛓️ BLOCKCHAIN
                  </div>

                  <h3 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '24px' }}>
                    Certificate of Completion
                  </h3>

                  <div style={{ marginBottom: '15px' }}>
                    <p style={{ margin: '5px 0', color: '#555' }}>
                      <strong>Certificate ID:</strong> {cert.certificate.certificateId}
                    </p>
                    <p style={{ margin: '5px 0', color: '#555' }}>
                      <strong>Name:</strong> {cert.certificate.userName}
                    </p>
                    <p style={{ margin: '5px 0', color: '#555' }}>
                      <strong>Role:</strong> {cert.certificate.role}
                    </p>
                    <p style={{ margin: '5px 0', color: '#555' }}>
                      <strong>Difficulty:</strong> {cert.certificate.difficulty}
                    </p>
                    <p style={{ margin: '5px 0', color: '#555' }}>
                      <strong>Score:</strong> {cert.certificate.score}/10
                    </p>
                    <p style={{ margin: '5px 0', color: '#555' }}>
                      <strong>Date:</strong> {new Date(cert.certificate.date).toLocaleDateString()}
                    </p>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.7)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                      <strong>Block Hash:</strong><br/>{cert.blockHash}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                      <strong>Block Index:</strong> {cert.blockIndex}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => verifyCertificate(cert.certificate.certificateId)}
                      disabled={verifying === cert.certificate.certificateId}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: verifying === cert.certificate.certificateId ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        opacity: verifying === cert.certificate.certificateId ? 0.6 : 1
                      }}
                    >
                      {verifying === cert.certificate.certificateId ? 'Verifying...' : '✓ Verify on Blockchain'}
                    </button>
                    <button
                      onClick={() => downloadCertificate(cert)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      📥 Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '30px', padding: '20px', background: '#f0f9ff', borderRadius: '8px', border: '2px solid #667eea' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#667eea' }}>🔒 Blockchain Security</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
              All certificates are secured on our blockchain network. Each certificate is immutable and can be independently verified using the certificate ID. The blockchain ensures authenticity and prevents tampering.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Certificates;
