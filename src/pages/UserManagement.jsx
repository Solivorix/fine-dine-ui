import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, restaurantAPI } from '../services/api';
import './UserManagement.css';

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filterRestaurant, setFilterRestaurant] = useState('all');
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form uses snake_case to match backend DTO JSON property names
  const [userForm, setUserForm] = useState({
    user_name: '',
    email: '',
    password: '',
    contact_number: '',
    role: 'staff',
    restaurant_id: '',
    created_by: 'admin'
  });

  const roles = [
    { value: 'admin', label: 'Admin', icon: '👑' },
    { value: 'manager', label: 'Manager', icon: '📊' },
    { value: 'staff', label: 'Staff', icon: '👤' },
    { value: 'waiter', label: 'Waiter', icon: '🍽️' },
    { value: 'chef', label: 'Chef', icon: '👨‍🍳' },
    { value: 'cashier', label: 'Cashier', icon: '💰' }
  ];

  useEffect(() => {
    fetchUsers();
    fetchRestaurants();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAll();
      setUsers(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const response = await restaurantAPI.getAll();
      setRestaurants(response.data || []);
    } catch (err) {
      console.error('Error fetching restaurants:', err);
    }
  };

  const getRestaurantName = (restaurantId) => {
    if (!restaurantId) return 'No Restaurant';
    const restaurant = restaurants.find(r => r.rest_id === restaurantId || r.restId === restaurantId);
    return restaurant ? restaurant.name : 'Unknown Restaurant';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone) => {
    const re = /^\+?[0-9\-\s]{7,15}$/;
    return re.test(phone);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();

    if (!userForm.restaurant_id) {
      alert('Please select a restaurant');
      return;
    }

    if (!userForm.user_name.trim()) {
      alert('Please enter a username');
      return;
    }

    if (!userForm.email.trim()) {
      alert('Please enter an email');
      return;
    }

    if (!validateEmail(userForm.email)) {
      alert('Please enter a valid email address');
      return;
    }

    if (!userForm.password || userForm.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    if (userForm.contact_number && !validatePhone(userForm.contact_number)) {
      alert('Please enter a valid contact number');
      return;
    }

    try {
      await userAPI.create(userForm);
      setShowAddModal(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      alert('Failed to create user. Please try again.');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();

    if (!selectedUser) return;

    if (!userForm.restaurant_id) {
      alert('Please select a restaurant');
      return;
    }

    if (!userForm.user_name.trim()) {
      alert('Please enter a username');
      return;
    }

    if (!userForm.email.trim()) {
      alert('Please enter an email');
      return;
    }

    if (!validateEmail(userForm.email)) {
      alert('Please enter a valid email address');
      return;
    }

    if (userForm.contact_number && !validatePhone(userForm.contact_number)) {
      alert('Please enter a valid contact number');
      return;
    }

    try {
      const updateData = { ...userForm };
      if (!updateData.password) {
        delete updateData.password;
      }
      updateData.updated_by = 'admin';

      await userAPI.patch(selectedUser.user_id, updateData);
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      alert('Failed to update user. Please try again.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await userAPI.delete(userId);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user. Please try again.');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setUserForm({
      user_name: user.user_name || '',
      email: user.email || '',
      password: '',
      contact_number: user.contact_number || '',
      role: user.role || 'staff',
      restaurant_id: user.restaurant_id || '',
      updated_by: 'admin'
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setUserForm({
      user_name: '',
      email: '',
      password: '',
      contact_number: '',
      role: 'staff',
      restaurant_id: '',
      created_by: 'admin'
    });
    setShowPassword(false);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedUser(null);
    resetForm();
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Filter users by restaurant and search term
  const filteredUsers = users.filter(user => {
    const matchesRestaurant = filterRestaurant === 'all' || user.restaurant_id === filterRestaurant;
    const matchesSearch = !searchTerm || 
      user.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRestaurant && matchesSearch;
  });

  const getRoleBadgeClass = (role) => {
    const roleClasses = {
      admin: 'role-admin',
      manager: 'role-manager',
      staff: 'role-staff',
      waiter: 'role-waiter',
      chef: 'role-chef',
      cashier: 'role-cashier'
    };
    return roleClasses[role] || 'role-default';
  };

  const getRoleIcon = (role) => {
    const roleData = roles.find(r => r.value === role);
    return roleData ? roleData.icon : '👤';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="user-management">
      {/* Header Section */}
      <div className="page-header">
        <div className="header-left">
          <button className="btn-back" onClick={handleBack}>
            <span className="back-icon">←</span>
            <span className="back-text">Back</span>
          </button>
          <div className="header-title">
            <h1>User Management</h1>
            <p className="header-subtitle">Manage your restaurant staff and users</p>
          </div>
        </div>
        <button className="btn-primary btn-add" onClick={() => setShowAddModal(true)}>
          <span className="btn-icon">+</span>
          Add User
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {restaurants.length === 0 && (
        <div className="alert-warning">
          <span className="alert-icon">⚠️</span>
          <span>No restaurants found. Please <a href="/restaurants">add a restaurant</a> first before creating users.</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Total Users</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏪</div>
          <div className="stat-info">
            <span className="stat-value">{restaurants.length}</span>
            <span className="stat-label">Restaurants</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👑</div>
          <div className="stat-info">
            <span className="stat-value">{users.filter(u => u.role === 'admin').length}</span>
            <span className="stat-label">Admins</span>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-dropdown">
          <label htmlFor="filterRestaurant">Restaurant:</label>
          <select
            id="filterRestaurant"
            value={filterRestaurant}
            onChange={(e) => setFilterRestaurant(e.target.value)}
            className="restaurant-filter"
          >
            <option value="all">All Restaurants</option>
            {restaurants.map(restaurant => (
              <option key={restaurant.rest_id} value={restaurant.rest_id}>
                {restaurant.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        {filteredUsers.length === 0 ? (
          <div className="no-users">
            <div className="no-users-icon">👤</div>
            <h3>No users found</h3>
            <p>Add your first user to get started!</p>
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Restaurant</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.user_id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.user_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="user-details">
                        <span className="user-name">{user.user_name}</span>
                        <span className="user-email">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="contact-number">{user.contact_number || '—'}</span>
                  </td>
                  <td>
                    <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                      <span className="role-icon">{getRoleIcon(user.role)}</span>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className="restaurant-badge">
                      {getRestaurantName(user.restaurant_id)}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="btn-action btn-edit"
                        onClick={() => openEditModal(user)}
                        title="Edit user"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-action btn-delete"
                        onClick={() => handleDeleteUser(user.user_id)}
                        title="Delete user"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New User</h2>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="restaurant_id">
                    <span className="label-icon">🏪</span>
                    Restaurant *
                  </label>
                  <select
                    id="restaurant_id"
                    name="restaurant_id"
                    value={userForm.restaurant_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select a restaurant</option>
                    {restaurants.map(restaurant => (
                      <option key={restaurant.rest_id} value={restaurant.rest_id}>
                        {restaurant.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="role">
                    <span className="label-icon">👤</span>
                    Role *
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={userForm.role}
                    onChange={handleInputChange}
                    required
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.icon} {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="user_name">
                  <span className="label-icon">✍️</span>
                  Username *
                </label>
                <input
                  type="text"
                  id="user_name"
                  name="user_name"
                  value={userForm.user_name}
                  onChange={handleInputChange}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  <span className="label-icon">📧</span>
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={userForm.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  <span className="label-icon">🔒</span>
                  Password *
                </label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={userForm.password}
                    onChange={handleInputChange}
                    placeholder="Enter password (min 6 characters)"
                    required
                    minLength="6"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="contact_number">
                  <span className="label-icon">📱</span>
                  Contact Number
                </label>
                <input
                  type="tel"
                  id="contact_number"
                  name="contact_number"
                  value={userForm.contact_number}
                  onChange={handleInputChange}
                  placeholder="e.g., +1-123-456-7890"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <span className="btn-icon">+</span>
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit User</h2>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleEditUser}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit_restaurant_id">
                    <span className="label-icon">🏪</span>
                    Restaurant *
                  </label>
                  <select
                    id="edit_restaurant_id"
                    name="restaurant_id"
                    value={userForm.restaurant_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select a restaurant</option>
                    {restaurants.map(restaurant => (
                      <option key={restaurant.rest_id} value={restaurant.rest_id}>
                        {restaurant.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="edit_role">
                    <span className="label-icon">👤</span>
                    Role *
                  </label>
                  <select
                    id="edit_role"
                    name="role"
                    value={userForm.role}
                    onChange={handleInputChange}
                    required
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.icon} {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="edit_user_name">
                  <span className="label-icon">✍️</span>
                  Username *
                </label>
                <input
                  type="text"
                  id="edit_user_name"
                  name="user_name"
                  value={userForm.user_name}
                  onChange={handleInputChange}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit_email">
                  <span className="label-icon">📧</span>
                  Email *
                </label>
                <input
                  type="email"
                  id="edit_email"
                  name="email"
                  value={userForm.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit_password">
                  <span className="label-icon">🔒</span>
                  New Password
                  <span className="label-hint">(leave blank to keep current)</span>
                </label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="edit_password"
                    name="password"
                    value={userForm.password}
                    onChange={handleInputChange}
                    placeholder="Enter new password (optional)"
                    minLength="6"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="edit_contact_number">
                  <span className="label-icon">📱</span>
                  Contact Number
                </label>
                <input
                  type="tel"
                  id="edit_contact_number"
                  name="contact_number"
                  value={userForm.contact_number}
                  onChange={handleInputChange}
                  placeholder="e.g., +1-123-456-7890"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <span className="btn-icon">✓</span>
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
