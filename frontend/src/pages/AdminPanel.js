import React, { useState, useEffect } from 'react';
import { admin } from '../utils/api';

const AdminPanel = ({ user }) => {
  const [gds, setGds] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('gds');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [gdsRes, usersRes] = await Promise.all([
        admin.getAllGDs(),
        admin.getAllUsers()
      ]);
      setGds(gdsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    }
  };

  const handleForceEnd = async (gdId) => {
    try {
      await admin.forceEndGD(gdId);
      fetchData();
    } catch (error) {
      console.error('Error ending GD:', error);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
      try {
        await admin.deleteUser(userId);
        fetchData();
        alert('User deleted successfully');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user');
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: '#dc3545', padding: '1rem 2rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Admin Panel</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Admin: {user.name}</span>
          <button onClick={logout} style={{ padding: '0.5rem 1rem', background: '#fff', color: '#dc3545', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </header>

      <div style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => setActiveTab('gds')}
            style={{ padding: '0.75rem 1.5rem', marginRight: '1rem', background: activeTab === 'gds' ? '#007bff' : '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Group Discussions ({gds.filter(gd => gd.isActive).length} Active)
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{ padding: '0.75rem 1.5rem', background: activeTab === 'users' ? '#007bff' : '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Users ({users.length})
          </button>
        </div>

        {activeTab === 'gds' && (
          <div>
            <h2>All Group Discussions</h2>
            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Title</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Moderator</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Participants</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Created</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {gds.map((gd) => (
                    <tr key={gd._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '1rem' }}>{gd.title}</td>
                      <td style={{ padding: '1rem' }}>{gd.moderator?.name || 'N/A'}</td>
                      <td style={{ padding: '1rem' }}>{gd.participants?.length || 0}/{gd.maxParticipants}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          background: gd.isActive ? '#d4edda' : '#f8d7da',
                          color: gd.isActive ? '#155724' : '#721c24'
                        }}>
                          {gd.isActive ? 'Active' : 'Ended'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                        {new Date(gd.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {gd.isActive && (
                          <button
                            onClick={() => handleForceEnd(gd._id)}
                            style={{ padding: '0.5rem 1rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            Force End
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2>All Users</h2>
            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Name</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Email</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Registered</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '1rem' }}>{user.name}</td>
                      <td style={{ padding: '1rem' }}>{user.email}</td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                        {new Date(user.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {user.email !== 'admin@gd.com' && (
                          <button
                            onClick={() => handleDeleteUser(user._id, user.name)}
                            style={{ padding: '0.5rem 1rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;