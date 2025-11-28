import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import './UserManagement.css';

const UserManagement = () => {
  const { user: currentUser, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editData, setEditData] = useState({});
  const [deleteOtp, setDeleteOtp] = useState('');
  const [deleteStep, setDeleteStep] = useState('request'); // 'request' or 'verify'
  const [generatedOtp, setGeneratedOtp] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setEditData({
      user_name: user.user_name || user.userName,
      email: user.email,
      contact_number: user.contact_number || user.contactNumber,
      role: user.role
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await userAPI.patch(selectedUser.user_id || selectedUser.userId, editData);
      alert('User updated successfully!');
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setDeleteStep('request');
    setDeleteOtp('');
    setShowDeleteModal(true);
  };

  const generateOtp = () => {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    return otp;
  };

  const handleSendOtp = async () => {
    const otp = generateOtp();
    
    // In a real application, send OTP via SMS/Email
    // For now, show it in console and alert
    console.log('OTP for deletion:', otp);
    alert(`OTP sent to ${selectedUser.contact_number || selectedUser.contactNumber}: ${otp}\n\n(In production, this would be sent via SMS)`);
    
    setDeleteStep('verify');
  };

  const handleDeleteConfirm = async () => {
    if (deleteOtp !== generatedOtp) {
      alert('Invalid OTP. Please try again.');
      return;
    }

    setLoading(true);

    try {
      await userAPI.delete(selectedUser.user_id || selectedUser.userId);
      alert('User deleted successfully!');
      setShowDeleteModal(false);
      setGeneratedOtp('');
      setDeleteOtp('');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-management">
      {/* Header */}
      <header className="admin-header">
        <div className="container">
          <div className="header-content">
            <div className="logo-section">
              <h1>👥 User Management</h1>
              <p>Manage staff and user accounts</p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <Link to="/admin" className="btn btn-outline">
                Back to Dashboard
              </Link>
              <button className="btn btn-secondary" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="user-main">
        <div className="container">
          {/* Current User Info */}
          <div className="current-user-card card fade-in">
            <h3>👤 Your Profile</h3>
            <div className="user-info">
              <div className="info-row">
                <span className="label">Name:</span>
                <span className="value">{currentUser?.loginId}</span>
              </div>
              <div className="info-row">
                <span className="label">Role:</span>
                <span className="badge badge-primary">{currentUser?.role}</span>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="users-section fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="section-header">
              <h2>All Users</h2>
              <Link to="/login" className="btn btn-primary">
                Register New User
              </Link>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="empty-state card">
                <p>No users found</p>
              </div>
            ) : (
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Mobile</th>
                      <th>Role</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.user_id || user.userId}>
                        <td>{user.user_name || user.userName}</td>
                        <td>{user.email}</td>
                        <td>{user.contact_number || user.contactNumber || 'N/A'}</td>
                        <td>
                          <span className={`badge badge-${user.role === 'ADMIN' ? 'primary' : user.role === 'MANAGER' ? 'warning' : 'success'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>{new Date(user.created_at || user.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => handleEditClick(user)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'var(--error)', color: 'white' }}
                              onClick={() => handleDeleteClick(user)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit User</h2>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-body">
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input
                  type="text"
                  className="input"
                  value={editData.user_name || ''}
                  onChange={(e) => setEditData({...editData, user_name: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={editData.email || ''}
                  onChange={(e) => setEditData({...editData, email: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Mobile Number</label>
                <input
                  type="tel"
                  className="input"
                  value={editData.contact_number || ''}
                  onChange={(e) => setEditData({...editData, contact_number: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                  pattern="[0-9]{10}"
                  maxLength="10"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Role</label>
                <select
                  className="select"
                  value={editData.role || 'STAFF'}
                  onChange={(e) => setEditData({...editData, role: e.target.value})}
                >
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal with OTP Verification */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete User</h2>
            </div>
            <div className="modal-body">
              {deleteStep === 'request' ? (
                <>
                  <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <strong>⚠️ Warning:</strong> This action cannot be undone!
                  </div>
                  <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--text-light)' }}>
                    Are you sure you want to delete user <strong>{selectedUser?.user_name || selectedUser?.userName}</strong>?
                  </p>
                  <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--text-light)' }}>
                    An OTP will be sent to their mobile number: <strong>{selectedUser?.contact_number || selectedUser?.contactNumber}</strong>
                  </p>
                </>
              ) : (
                <>
                  <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--text-light)' }}>
                    OTP has been sent to <strong>{selectedUser?.contact_number || selectedUser?.contactNumber}</strong>
                  </p>
                  <div className="input-group">
                    <label className="input-label">Enter OTP</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter 6-digit OTP"
                      value={deleteOtp}
                      onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength="6"
                      autoFocus
                    />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteStep('request');
                  setDeleteOtp('');
                  setGeneratedOtp('');
                }}
              >
                Cancel
              </button>
              {deleteStep === 'request' ? (
                <button
                  className="btn"
                  style={{ background: 'var(--warning)', color: 'white' }}
                  onClick={handleSendOtp}
                >
                  Send OTP
                </button>
              ) : (
                <button
                  className="btn"
                  style={{ background: 'var(--error)', color: 'white' }}
                  onClick={handleDeleteConfirm}
                  disabled={deleteOtp.length !== 6 || loading}
                >
                  {loading ? 'Deleting...' : 'Confirm Delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
