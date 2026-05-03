import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import api from '../utils/api';

const Profile = ({ user, setUser }) => {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('info'); // 'info' | 'password'
  const [form, setForm] = useState({ name: '', bio: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [picLoading, setPicLoading] = useState(false);

  useEffect(() => {
    api.get('/profile').then(res => {
      setProfile(res.data);
      setForm({ name: res.data.name, bio: res.data.bio || '' });
    }).catch(() => navigate('/dashboard'));
  }, [navigate]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 3000);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/profile', form);
      setProfile(res.data.user);
      const updated = { ...user, name: res.data.user.name };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      showMsg('success', 'Profile updated successfully!');
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) return showMsg('error', 'Image must be under 1MB');
    setPicLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const res = await api.put('/profile/picture', { profilePicture: ev.target.result });
        setProfile(res.data.user);
        const updated = { ...user, profilePicture: res.data.user.profilePicture };
        localStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
        showMsg('success', 'Profile picture updated!');
      } catch (err) {
        showMsg('error', err.response?.data?.message || 'Upload failed');
      } finally {
        setPicLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword)
      return showMsg('error', 'New passwords do not match');
    if (pwForm.newPassword.length < 6)
      return showMsg('error', 'Password must be at least 6 characters');
    setLoading(true);
    try {
      await api.put('/profile/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword
      });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showMsg('success', 'Password changed successfully!');
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem', border: '1px solid #e5e7eb',
    borderRadius: '10px', fontSize: '0.95rem', outline: 'none',
    background: '#f9fafb', boxSizing: 'border-box', transition: 'border-color 0.2s'
  };

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8' }}>
      <Navigation user={user} />
      <div style={{ textAlign: 'center', padding: '5rem', color: '#9ca3af' }}>Loading profile...</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', fontFamily: "'Segoe UI', sans-serif" }}>
      <Navigation user={user} />

      <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '0 1.5rem 3rem' }}>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.3rem', color: '#1f2937', fontWeight: '700' }}>👤 My Profile</h2>

        {/* Profile Card */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              {profile.profilePicture ? (
                <img src={profile.profilePicture} alt="avatar"
                  style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e0e7ff' }} />
              ) : (
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', color: 'white', fontWeight: '700', border: '3px solid #e0e7ff' }}>
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <button onClick={() => fileRef.current.click()} disabled={picLoading}
                style={{ position: 'absolute', bottom: 0, right: 0, width: '28px', height: '28px', borderRadius: '50%', background: '#4f46e5', border: '2px solid white', cursor: 'pointer', fontSize: '0.75rem', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {picLoading ? '⏳' : '✏️'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePictureChange} />
            </div>
            {/* Info */}
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#1f2937' }}>{profile.name}</div>
              <div style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>{profile.email}</div>
              <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              {profile.bio && <div style={{ color: '#4b5563', fontSize: '0.875rem', marginTop: '0.5rem', fontStyle: 'italic' }}>{profile.bio}</div>}
            </div>
          </div>
        </div>

        {/* Message */}
        {msg.text && (
          <div style={{ background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'success' ? '#16a34a' : '#dc2626', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>
            {msg.type === 'success' ? '✅' : '❌'} {msg.text}
          </div>
        )}

        {/* Tabs */}
        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            {[['info', '✏️ Edit Profile'], ['password', '🔒 Change Password']].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: 1, padding: '1rem', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600',
                background: tab === key ? '#f5f3ff' : 'white',
                color: tab === key ? '#4f46e5' : '#6b7280',
                borderBottom: tab === key ? '2px solid #4f46e5' : '2px solid transparent',
                transition: 'all 0.2s'
              }}>{label}</button>
            ))}
          </div>

          <div style={{ padding: '1.75rem' }}>
            {/* Edit Profile Tab */}
            {tab === 'info' && (
              <form onSubmit={handleUpdateProfile}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Full Name</label>
                  <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    onFocus={e => e.target.style.borderColor = '#4f46e5'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    placeholder="Your full name" required />
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Email</label>
                  <input style={{ ...inputStyle, background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }} value={profile.email} disabled />
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.3rem' }}>Email cannot be changed</div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Bio</label>
                  <textarea style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} value={form.bio}
                    onChange={e => setForm({ ...form, bio: e.target.value })}
                    onFocus={e => e.target.style.borderColor = '#4f46e5'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    placeholder="Tell something about yourself..." />
                </div>
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '0.85rem', background: '#4f46e5', color: 'white',
                  border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
                }}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            )}

            {/* Change Password Tab */}
            {tab === 'password' && (
              <form onSubmit={handleChangePassword}>
                {[['currentPassword', 'Current Password', 'Enter current password'],
                  ['newPassword', 'New Password', 'At least 6 characters'],
                  ['confirmPassword', 'Confirm New Password', 'Re-enter new password']
                ].map(([key, label, placeholder]) => (
                  <div key={key} style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>{label}</label>
                    <input type="password" style={inputStyle} value={pwForm[key]}
                      onChange={e => setPwForm({ ...pwForm, [key]: e.target.value })}
                      onFocus={e => e.target.style.borderColor = '#4f46e5'}
                      onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                      placeholder={placeholder} required />
                  </div>
                ))}
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '0.85rem', background: '#4f46e5', color: 'white',
                  border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
                }}>
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
