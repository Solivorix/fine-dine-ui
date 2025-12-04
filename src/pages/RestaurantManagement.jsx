import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { restaurantAPI } from '../services/api';
import ImageUpload from '../components/ImageUpload';
import './RestaurantManagement.css';

const RestaurantManagement = () => {
  const { logout } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  
  // Form state - using camelCase for internal state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    gstNo: '',
    primaryContactNumber: '',
    primaryEmailId: '',
    imageUrl: ''
  });
  
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await restaurantAPI.getAll();
      console.log('Fetched restaurants:', response.data);
      setRestaurants(response.data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      gstNo: '',
      primaryContactNumber: '',
      primaryEmailId: '',
      imageUrl: ''
    });
    setFormError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setFormError('Restaurant name is required');
      return false;
    }
    if (!formData.address.trim()) {
      setFormError('Address is required');
      return false;
    }
    if (!formData.primaryContactNumber.trim()) {
      setFormError('Contact number is required');
      return false;
    }
    if (!formData.primaryEmailId.trim()) {
      setFormError('Email is required');
      return false;
    }
    return true;
  };

  const handleAddRestaurant = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Create request with exact field names matching backend
      const requestData = {
        name: formData.name,
        address: formData.address,
        gst_no: formData.gstNo,  // Backend expects gst_no
        primaryEmailId: formData.primaryEmailId,
        primaryContactNumber: formData.primaryContactNumber
      };

      // Only add imageUrl if it exists
      if (formData.imageUrl && formData.imageUrl.trim()) {
        requestData.imageUrl = formData.imageUrl;
      }

      console.log('=== SENDING TO BACKEND ===');
      console.log('Request Data:', JSON.stringify(requestData, null, 2));
      
      const response = await restaurantAPI.create(requestData);
      
      console.log('=== BACKEND RESPONSE ===');
      console.log('Response:', response.data);

      alert('Restaurant added successfully!');
      setShowAddModal(false);
      resetForm();
      fetchRestaurants();
    } catch (error) {
      console.error('=== ERROR ===');
      console.error('Error:', error);
      console.error('Response:', error.response?.data);
      setFormError(error.response?.data?.message || 'Failed to add restaurant. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRestaurant = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Create request with exact field names matching backend
      const requestData = {
        name: formData.name,
        address: formData.address,
        gst_no: formData.gstNo,  // Backend expects gst_no
        primaryEmailId: formData.primaryEmailId,
        primaryContactNumber: formData.primaryContactNumber
      };

      // Only add imageUrl if it exists
      if (formData.imageUrl && formData.imageUrl.trim()) {
        requestData.imageUrl = formData.imageUrl;
      }

      console.log('=== UPDATING RESTAURANT ===');
      console.log('Restaurant ID:', selectedRestaurant.rest_id || selectedRestaurant.restId);
      console.log('Request Data:', JSON.stringify(requestData, null, 2));
      
      await restaurantAPI.patch(selectedRestaurant.rest_id || selectedRestaurant.restId, requestData);

      alert('Restaurant updated successfully!');
      setShowEditModal(false);
      fetchRestaurants();
    } catch (error) {
      console.error('=== ERROR ===');
      console.error('Error:', error);
      console.error('Response:', error.response?.data);
      setFormError(error.response?.data?.message || 'Failed to update restaurant');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRestaurant = async (restaurantId) => {
    if (!window.confirm('Are you sure you want to delete this restaurant? This action cannot be undone.')) {
      return;
    }

    setLoading(true);

    try {
      await restaurantAPI.delete(restaurantId);
      alert('Restaurant deleted successfully!');
      fetchRestaurants();
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      alert('Failed to delete restaurant');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (restaurant) => {
    setSelectedRestaurant(restaurant);
    
    // Map response fields to form state
    setFormData({
      name: restaurant.name || '',
      address: restaurant.address || '',
      gstNo: restaurant.gst_no || restaurant.gstNo || '',
      primaryContactNumber: restaurant.primaryContactNumber || '',
      primaryEmailId: restaurant.primaryEmailId || '',
      imageUrl: restaurant.imageUrl || ''
    });
    
    setShowEditModal(true);
  };

  const handleImageUpload = (imageUrl) => {
    setFormData({ ...formData, imageUrl });
  };

  return (
    <div className="restaurant-management">
      {/* Header */}
      <header className="admin-header">
        <div className="container">
          <div className="header-content">
            <div className="logo-section">
              <h1>🏪 Restaurant Management</h1>
              <p>Manage restaurant locations and details</p>
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
      <main className="restaurant-main">
        <div className="container">
          {/* Header */}
          <div className="restaurant-header fade-in">
            <h2>Restaurants</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
            >
              + Add New Restaurant
            </button>
          </div>

          {/* Restaurants Grid */}
          {loading && restaurants.length === 0 ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading restaurants...</p>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-icon">🏪</div>
              <h3>No Restaurants</h3>
              <p>Click "Add New Restaurant" to create your first restaurant</p>
            </div>
          ) : (
            <div className="restaurants-grid fade-in" style={{ animationDelay: '0.1s' }}>
              {restaurants.map((restaurant, index) => (
                <div
                  key={restaurant.rest_id || restaurant.restId}
                  className="restaurant-card card"
                  style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                >
                  <div className="restaurant-image">
                    {restaurant.imageUrl ? (
                      <img src={restaurant.imageUrl} alt={restaurant.name} />
                    ) : (
                      <div className="placeholder-image">
                        <span>🏪</span>
                      </div>
                    )}
                  </div>

                  <div className="restaurant-content">
                    <h3>{restaurant.name}</h3>
                    
                    <div className="restaurant-info">
                      <div className="info-item">
                        <span className="icon">📍</span>
                        <span className="text">{restaurant.address || 'No address'}</span>
                      </div>

                      <div className="info-item">
                        <span className="icon">📞</span>
                        <span className="text">{restaurant.primaryContactNumber || 'No phone'}</span>
                      </div>

                      {restaurant.primaryEmailId && (
                        <div className="info-item">
                          <span className="icon">✉️</span>
                          <span className="text">{restaurant.primaryEmailId}</span>
                        </div>
                      )}

                      {(restaurant.gst_no || restaurant.gstNo) && (
                        <div className="info-item">
                          <span className="icon">🆔</span>
                          <span className="text">GST: {restaurant.gst_no || restaurant.gstNo}</span>
                        </div>
                      )}
                    </div>

                    <div className="restaurant-actions">
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => openEditModal(restaurant)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ background: 'var(--error)', color: 'white' }}
                        onClick={() => handleDeleteRestaurant(restaurant.rest_id || restaurant.restId)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Restaurant Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Restaurant</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            <form onSubmit={handleAddRestaurant} className="modal-body">
              {formError && (
                <div className="alert alert-error">
                  {formError}
                </div>
              )}

              {/* Image Upload (Optional) */}
              <div className="form-section">
                <h3>Restaurant Photo (Optional)</h3>
                <ImageUpload
                  currentImage={formData.imageUrl}
                  onImageChange={handleImageUpload}
                  uploadType="restaurant"
                  label="Upload Restaurant Photo"
                />
              </div>

              {/* Basic Information */}
              <div className="form-section">
                <h3>Basic Information</h3>

                <div className="input-group">
                  <label className="input-label">Restaurant Name *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., The Golden Spoon"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Address *</label>
                  <textarea
                    className="textarea"
                    placeholder="Full restaurant address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    rows="3"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">GST Number (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., 22AAAAA0000A1Z5"
                    value={formData.gstNo}
                    onChange={(e) => setFormData({...formData, gstNo: e.target.value})}
                  />
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Phone Number *</label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="e.g., 9876543210"
                      value={formData.primaryContactNumber}
                      onChange={(e) => setFormData({...formData, primaryContactNumber: e.target.value})}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Email *</label>
                    <input
                      type="email"
                      className="input"
                      placeholder="restaurant@example.com"
                      value={formData.primaryEmailId}
                      onChange={(e) => setFormData({...formData, primaryEmailId: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Adding Restaurant...' : 'Add Restaurant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Restaurant Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Restaurant</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>

            <form onSubmit={handleEditRestaurant} className="modal-body">
              {formError && (
                <div className="alert alert-error">
                  {formError}
                </div>
              )}

              {/* Image Upload (Optional) */}
              <div className="form-section">
                <h3>Restaurant Photo (Optional)</h3>
                <ImageUpload
                  currentImage={formData.imageUrl}
                  onImageChange={handleImageUpload}
                  uploadType="restaurant"
                  label="Upload Restaurant Photo"
                />
              </div>

              {/* Basic Information */}
              <div className="form-section">
                <h3>Basic Information</h3>

                <div className="input-group">
                  <label className="input-label">Restaurant Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Address *</label>
                  <textarea
                    className="textarea"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    rows="3"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">GST Number (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.gstNo}
                    onChange={(e) => setFormData({...formData, gstNo: e.target.value})}
                  />
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Phone Number *</label>
                    <input
                      type="tel"
                      className="input"
                      value={formData.primaryContactNumber}
                      onChange={(e) => setFormData({...formData, primaryContactNumber: e.target.value})}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Email *</label>
                    <input
                      type="email"
                      className="input"
                      value={formData.primaryEmailId}
                      onChange={(e) => setFormData({...formData, primaryEmailId: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Restaurant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantManagement;
