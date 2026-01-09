import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userAPI, restaurantAPI } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCrown, faChartBar, faUser, faUtensils, faKitchenSet, faMoneyBill,
  faArrowLeft, faBan, faExclamationTriangle, faUsers, faStore,
  faSearch, faPen, faTrash, faEnvelope, faLock, faEye, faEyeSlash,
  faPhone, faSignature, faCheck
} from '@fortawesome/free-solid-svg-icons';
import './UserManagement.css';

const UserManagement = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
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

  // CRITICAL: Check if current user is ADMIN (case-insensitive)
  const isAdmin = () => {
    if (!currentUser || !currentUser.role) {
      console.log('❌ No user or role found');
      return false;
    }
    const userRole = currentUser.role.toUpperCase();
    const isAdminRole = userRole === 'ADMIN';
    console.log('🔍 Role Check:', { 
      currentRole: currentUser.role, 
      normalized: userRole, 
      isAdmin: isAdminRole 
    });
    return isAdminRole;
  };

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
    { value: 'admin', label: 'Admin', icon: faCrown },
    { value: 'manager', label: 'Manager', icon: faChartBar },
    { value: 'staff', label: 'Staff', icon: faUser },
    { value: 'waiter', label: 'Waiter', icon: faUtensils },
    { value: 'chef', label: 'Chef', icon: faKitchenSet },
    { value: 'cashier', label: 'Cashier', icon: faMoneyBill }
  ];

  useEffect(() => {
    console.log('🔄 UserManagement component mounted');
    console.log('👤 Current user:', currentUser);
    
    // CRITICAL: Verify admin access on mount
    if (!isAdmin()) {
      console.log('❌ ACCESS DENIED: User is not an admin');
      alert('Access Denied: Only administrators can manage users.');
      navigate('/admin');
      return;
    }

    console.log('✅ Admin access verified');
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

    // CRITICAL: Admin check before adding user
    if (!isAdmin()) {
      console.log('❌ BLOCKED: Non-admin tried to add user');
      alert('Access Denied: Only administrators can add users.');
      return;
    }

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
      console.log('➕ Adding new user...');
      await userAPI.create(userForm);
      console.log('✅ User created successfully');
      setShowAddModal(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error('❌ Error creating user:', err);
      alert('Failed to create user. Please try again.');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();

    // CRITICAL: Admin check before editing user
    if (!isAdmin()) {
      console.log('❌ BLOCKED: Non-admin tried to edit user');
      alert('Access Denied: Only administrators can edit users.');
      return;
    }

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
      console.log('✏️ Updating user...');
      const updateData = { ...userForm };
      if (!updateData.password) {
        delete updateData.password;
      }
      updateData.user_id = selectedUser.user_id;
      updateData.updated_by = 'admin';

      await userAPI.patch(selectedUser.user_id, updateData);
      console.log('✅ User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error('❌ Error updating user:', err);
      alert('Failed to update user. Please try again.');
    }
  };

  const handleDeleteUser = async (userId) => {
    // CRITICAL: Admin check before deleting user
    if (!isAdmin()) {
      console.log('❌ BLOCKED: Non-admin tried to delete user');
      alert('Access Denied: Only administrators can delete users.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('🗑️ Deleting user...');
      await userAPI.delete(userId);
      console.log('✅ User deleted successfully');
      fetchUsers();
    } catch (err) {
      console.error('❌ Error deleting user:', err);
      alert('Failed to delete user. Please try again.');
    }
  };

  const openEditModal = (user) => {
    // CRITICAL: Admin check before opening edit modal
    if (!isAdmin()) {
      console.log('❌ BLOCKED: Non-admin tried to open edit modal');
      alert('Access Denied: Only administrators can edit users.');
      return;
    }

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

  const openAddModal = () => {
    // CRITICAL: Admin check before opening add modal
    if (!isAdmin()) {
      console.log('❌ BLOCKED: Non-admin tried to open add modal');
      alert('Access Denied: Only administrators can add users.');
      return;
    }
    setShowAddModal(true);
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
    return roleClasses[role?.toLowerCase()] || 'role-default';
  };

  const getRoleIcon = (role) => {
    const roleData = roles.find(r => r.value === role?.toLowerCase());
    return roleData ? roleData.icon : faUser;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  // CRITICAL: Show access denied if not admin
  if (!isAdmin()) {
    return (
      <div className="user-management">
        <div className="page-header">
          <div className="header-left">
            <button className="btn-back" onClick={() => navigate('/admin')}>
              <span className="back-icon"><FontAwesomeIcon icon={faArrowLeft} /></span>
              <span className="back-text">Back to Dashboard</span>
            </button>
          </div>
        </div>
        <div style={{ 
          maxWidth: '600px', 
          margin: '100px auto', 
          textAlign: 'center',
          padding: '40px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}><FontAwesomeIcon icon={faBan} /></div>
          <h2 style={{ color: '#c0392b', marginBottom: '10px' }}>Access Denied</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>
            Only administrators can manage users.
          </p>
          <p style={{ color: '#999', fontSize: '14px' }}>
            Your role: <strong>{currentUser?.role || 'Unknown'}</strong>
          </p>
          <button 
            onClick={() => navigate('/admin')} 
            className="btn btn-primary"
            style={{ marginTop: '20px' }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      {/* Header Section */}
      <div className="page-header">
        <div className="header-left">
          <button className="btn-back" onClick={handleBack}>
            <span className="back-icon"><FontAwesomeIcon icon={faArrowLeft} /></span>
            <span className="back-text">Back</span>
          </button>
          <div className="header-title">
            <h1>User Management</h1>
            <p className="header-subtitle">Manage your restaurant staff and users (Admin Only)</p>
          </div>
        </div>
        <button className="btn-primary btn-add" onClick={openAddModal}>
          <span className="btn-icon">+</span>
          Add User
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon"><FontAwesomeIcon icon={faExclamationTriangle} /></span>
          {error}
        </div>
      )}

      {restaurants.length === 0 && (
        <div className="alert-warning">
          <span className="alert-icon"><FontAwesomeIcon icon={faExclamationTriangle} /></span>
          <span>No restaurants found. Please <a href="/admin/restaurants">add a restaurant</a> first before creating users.</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faUsers} /></div>
          <div className="stat-info">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Total Users</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faStore} /></div>
          <div className="stat-info">
            <span className="stat-value">{restaurants.length}</span>
            <span className="stat-label">Restaurants</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faCrown} /></div>
          <div className="stat-info">
            <span className="stat-value">{users.filter(u => u.role?.toLowerCase() === 'admin').length}</span>
            <span className="stat-label">Admins</span>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="search-box">
          <span className="search-icon"><FontAwesomeIcon icon={faSearch} /></span>
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
            <div className="no-users-icon"><FontAwesomeIcon icon={faUser} /></div>
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
                      <span className="role-icon"><FontAwesomeIcon icon={getRoleIcon(user.role)} /></span>
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
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                      <button
                        className="btn-action btn-delete"
                        onClick={() => handleDeleteUser(user.user_id)}
                        title="Delete user"
                      >
                        <FontAwesomeIcon icon={faTrash} />
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
                    <span className="label-icon"><FontAwesomeIcon icon={faStore} /></span>
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
                    <span className="label-icon"><FontAwesomeIcon icon={faUser} /></span>
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
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="user_name">
                  <span className="label-icon"><FontAwesomeIcon icon={faSignature} /></span>
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
                  <span className="label-icon"><FontAwesomeIcon icon={faEnvelope} /></span>
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
                  <span className="label-icon"><FontAwesomeIcon icon={faLock} /></span>
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
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="contact_number">
                  <span className="label-icon"><FontAwesomeIcon icon={faPhone} /></span>
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
                    <span className="label-icon"><FontAwesomeIcon icon={faStore} /></span>
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
                    <span className="label-icon"><FontAwesomeIcon icon={faUser} /></span>
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
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="edit_user_name">
                  <span className="label-icon"><FontAwesomeIcon icon={faSignature} /></span>
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
                  <span className="label-icon"><FontAwesomeIcon icon={faEnvelope} /></span>
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
                  <span className="label-icon"><FontAwesomeIcon icon={faLock} /></span>
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
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="edit_contact_number">
                  <span className="label-icon"><FontAwesomeIcon icon={faPhone} /></span>
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
                  <span className="btn-icon"><FontAwesomeIcon icon={faCheck} /></span>
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
