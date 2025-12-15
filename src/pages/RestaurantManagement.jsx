import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { restaurantAPI } from '../services/api';
import './RestaurantManagement.css';

const RestaurantManagement = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

  // Form uses camelCase internally (gstNo) but converts to snake_case (gst_no) for API calls
  // This matches the backend's @JsonProperty("gst_no") annotation
  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    gstNo: '',
    address: '',
    primaryEmailId: '',
    primaryContactNumber: '',
    imageUrl: '',
    createdBy: 'admin'
  });

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await restaurantAPI.getAll();
      setRestaurants(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch restaurants');
      console.error('Error fetching restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRestaurantForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (JPG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/upload/restaurant-image`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success === 'true' || result.success === true) {
        setRestaurantForm(prev => ({
          ...prev,
          imageUrl: result.fileUrl
        }));
      } else {
        alert('Failed to upload image: ' + (result.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!restaurantForm.imageUrl) return;

    try {
      await fetch(`${API_BASE_URL}/api/upload/image?url=${encodeURIComponent(restaurantForm.imageUrl)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error deleting image:', err);
    }

    setRestaurantForm(prev => ({
      ...prev,
      imageUrl: ''
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${API_BASE_URL}${imageUrl}`;
  };

  const handleAddRestaurant = async (e) => {
    e.preventDefault();

    if (!restaurantForm.name.trim()) {
      alert('Please enter a restaurant name');
      return;
    }

    try {
      // Send data with gst_no (underscore) to match backend @JsonProperty annotation
      const payload = {
        name: restaurantForm.name,
        gst_no: restaurantForm.gstNo,  // Convert gstNo to gst_no for backend
        address: restaurantForm.address,
        primaryEmailId: restaurantForm.primaryEmailId,
        primaryContactNumber: restaurantForm.primaryContactNumber,
        imageUrl: restaurantForm.imageUrl,
        createdBy: restaurantForm.createdBy
      };
      
      console.log('Creating restaurant with payload:', payload);
      await restaurantAPI.create(payload);
      setShowAddModal(false);
      resetForm();
      fetchRestaurants();
    } catch (err) {
      console.error('Error creating restaurant:', err);
      alert('Failed to create restaurant. Please try again.');
    }
  };

  const handleEditRestaurant = async (e) => {
    e.preventDefault();

    if (!selectedRestaurant) return;

    // Get ID from either rest_id (API response) or restId
    const restaurantId = selectedRestaurant.rest_id || selectedRestaurant.restId;

    try {
      const updateData = { 
        name: restaurantForm.name,
        gst_no: restaurantForm.gstNo,  // Convert gstNo to gst_no for backend
        address: restaurantForm.address,
        primaryEmailId: restaurantForm.primaryEmailId,
        primaryContactNumber: restaurantForm.primaryContactNumber,
        imageUrl: restaurantForm.imageUrl,
        restId: restaurantId,
        modifiedBy: 'admin' 
      };
      
      console.log('Updating restaurant with payload:', updateData);
      await restaurantAPI.patch(restaurantId, updateData);
      setShowEditModal(false);
      setSelectedRestaurant(null);
      resetForm();
      fetchRestaurants();
    } catch (err) {
      console.error('Error updating restaurant:', err);
      alert('Failed to update restaurant. Please try again.');
    }
  };

  const handleDeleteRestaurant = async (restId) => {
    if (!window.confirm('Are you sure you want to delete this restaurant? This will also affect all associated users and menu items.')) return;

    try {
      const restaurant = restaurants.find(r => (r.rest_id || r.restId) === restId);
      const imageUrl = restaurant?.imageUrl;
      if (imageUrl) {
        try {
          await fetch(`${API_BASE_URL}/api/upload/image?url=${encodeURIComponent(imageUrl)}`, {
            method: 'DELETE',
          });
        } catch (err) {
          console.error('Error deleting image:', err);
        }
      }

      await restaurantAPI.delete(restId);
      fetchRestaurants();
    } catch (err) {
      console.error('Error deleting restaurant:', err);
      alert('Failed to delete restaurant. Please try again.');
    }
  };

  const openEditModal = (restaurant) => {
    setSelectedRestaurant(restaurant);
    // Handle both gst_no and gstNo from backend
    const gstValue = restaurant.gstNo || restaurant.gst_no || '';
    setRestaurantForm({
      name: restaurant.name || '',
      gstNo: gstValue,
      address: restaurant.address || '',
      primaryEmailId: restaurant.primaryEmailId || '',
      primaryContactNumber: restaurant.primaryContactNumber || '',
      imageUrl: restaurant.imageUrl || '',
      modifiedBy: 'admin'
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setRestaurantForm({
      name: '',
      gstNo: '',
      address: '',
      primaryEmailId: '',
      primaryContactNumber: '',
      imageUrl: '',
      createdBy: 'admin'
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedRestaurant(null);
    resetForm();
  };

  const handleBack = () => {
    navigate(-1);
  };

  const filteredRestaurants = restaurants.filter(restaurant => {
    return !searchTerm ||
      restaurant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.address?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading restaurants...</p>
      </div>
    );
  }

  return (
    <div className="restaurant-management">
      {/* Header Section */}
      <div className="page-header">
        <div className="header-left">
          <button className="btn-back" onClick={handleBack}>
            <span className="back-icon">←</span>
            <span className="back-text">Back</span>
          </button>
          <div className="header-title">
            <h1>Restaurant Management</h1>
            <p className="header-subtitle">Manage your restaurant locations and details</p>
          </div>
        </div>
        <button className="btn-primary btn-add" onClick={() => setShowAddModal(true)}>
          <span className="btn-icon">+</span>
          Add Restaurant
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon">🏪</div>
          <div className="stat-info">
            <span className="stat-value">{restaurants.length}</span>
            <span className="stat-label">Total Restaurants</span>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="filter-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search restaurants by name or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Restaurants Grid */}
      <div className="restaurants-grid">
        {filteredRestaurants.length === 0 ? (
          <div className="no-restaurants">
            <div className="no-restaurants-icon">🏪</div>
            <h3>No restaurants found</h3>
            <p>Add your first restaurant to get started!</p>
          </div>
        ) : (
          filteredRestaurants.map(restaurant => {
            const id = restaurant.rest_id || restaurant.restId;
            const imageUrl = restaurant.imageUrl;
            const primaryContactNumber = restaurant.primaryContactNumber;
            const primaryEmailId = restaurant.primaryEmailId;
            const gstNo = restaurant.gstNo || restaurant.gst_no;
            
            return (
            <div key={id} className="restaurant-card">
              <div className="card-image">
                {imageUrl ? (
                  <img
                    src={getImageUrl(imageUrl)}
                    alt={restaurant.name}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="image-placeholder" style={{ display: imageUrl ? 'none' : 'flex' }}>
                  <span>🏪</span>
                </div>
              </div>
              <div className="card-content">
                <h3 className="restaurant-name">{restaurant.name}</h3>
                {gstNo && (
                  <p className="restaurant-gst">GST: {gstNo}</p>
                )}
                <div className="restaurant-details">
                  {restaurant.address && (
                    <div className="detail-item">
                      <span className="detail-icon">📍</span>
                      <span>{restaurant.address}</span>
                    </div>
                  )}
                  {primaryContactNumber && (
                    <div className="detail-item">
                      <span className="detail-icon">📞</span>
                      <span>{primaryContactNumber}</span>
                    </div>
                  )}
                  {primaryEmailId && (
                    <div className="detail-item">
                      <span className="detail-icon">📧</span>
                      <span>{primaryEmailId}</span>
                    </div>
                  )}
                </div>
                <div className="card-actions">
                  <button
                    className="btn-action btn-edit"
                    onClick={() => openEditModal(restaurant)}
                  >
                    <span>✏️</span> Edit
                  </button>
                  <button
                    className="btn-action btn-delete"
                    onClick={() => handleDeleteRestaurant(id)}
                  >
                    <span>🗑️</span> Delete
                  </button>
                </div>
              </div>
            </div>
          )})
        )}
      </div>

      {/* Add Restaurant Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Restaurant</h2>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleAddRestaurant}>
              <div className="form-group">
                <label htmlFor="name">
                  <span className="label-icon">🏪</span>
                  Restaurant Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={restaurantForm.name}
                  onChange={handleInputChange}
                  placeholder="Enter restaurant name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="gstNo">
                  <span className="label-icon">📋</span>
                  GST Number
                </label>
                <input
                  type="text"
                  id="gstNo"
                  name="gstNo"
                  value={restaurantForm.gstNo}
                  onChange={handleInputChange}
                  placeholder="Enter GST registration number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">
                  <span className="label-icon">📍</span>
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={restaurantForm.address}
                  onChange={handleInputChange}
                  placeholder="Enter restaurant address"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="primaryContactNumber">
                    <span className="label-icon">📞</span>
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    id="primaryContactNumber"
                    name="primaryContactNumber"
                    value={restaurantForm.primaryContactNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., +1-123-456-7890"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="primaryEmailId">
                    <span className="label-icon">📧</span>
                    Email
                  </label>
                  <input
                    type="email"
                    id="primaryEmailId"
                    name="primaryEmailId"
                    value={restaurantForm.primaryEmailId}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="form-group">
                <label>
                  <span className="label-icon">🖼️</span>
                  Restaurant Image
                </label>
                <div className="image-upload-container">
                  {restaurantForm.imageUrl ? (
                    <div className="image-preview">
                      <img src={getImageUrl(restaurantForm.imageUrl)} alt="Preview" />
                      <button type="button" className="btn-remove-image" onClick={handleRemoveImage}>
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <div className="image-upload-placeholder">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleImageChange}
                        disabled={uploading}
                      />
                      {uploading && <span className="uploading-text">Uploading...</span>}
                      <p className="upload-hint">Accepted formats: JPG, PNG, GIF, WebP (Max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={uploading}>
                  <span className="btn-icon">+</span>
                  Add Restaurant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Restaurant Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Restaurant</h2>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleEditRestaurant}>
              <div className="form-group">
                <label htmlFor="edit_name">
                  <span className="label-icon">🏪</span>
                  Restaurant Name *
                </label>
                <input
                  type="text"
                  id="edit_name"
                  name="name"
                  value={restaurantForm.name}
                  onChange={handleInputChange}
                  placeholder="Enter restaurant name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit_gstNo">
                  <span className="label-icon">📋</span>
                  GST Number
                </label>
                <input
                  type="text"
                  id="edit_gstNo"
                  name="gstNo"
                  value={restaurantForm.gstNo}
                  onChange={handleInputChange}
                  placeholder="Enter GST registration number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit_address">
                  <span className="label-icon">📍</span>
                  Address
                </label>
                <input
                  type="text"
                  id="edit_address"
                  name="address"
                  value={restaurantForm.address}
                  onChange={handleInputChange}
                  placeholder="Enter restaurant address"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit_primaryContactNumber">
                    <span className="label-icon">📞</span>
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    id="edit_primaryContactNumber"
                    name="primaryContactNumber"
                    value={restaurantForm.primaryContactNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., +1-123-456-7890"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit_primaryEmailId">
                    <span className="label-icon">📧</span>
                    Email
                  </label>
                  <input
                    type="email"
                    id="edit_primaryEmailId"
                    name="primaryEmailId"
                    value={restaurantForm.primaryEmailId}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="form-group">
                <label>
                  <span className="label-icon">🖼️</span>
                  Restaurant Image
                </label>
                <div className="image-upload-container">
                  {restaurantForm.imageUrl ? (
                    <div className="image-preview">
                      <img src={getImageUrl(restaurantForm.imageUrl)} alt="Preview" />
                      <button type="button" className="btn-remove-image" onClick={handleRemoveImage}>
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <div className="image-upload-placeholder">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleImageChange}
                        disabled={uploading}
                      />
                      {uploading && <span className="uploading-text">Uploading...</span>}
                      <p className="upload-hint">Accepted formats: JPG, PNG, GIF, WebP (Max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={uploading}>
                  <span className="btn-icon">✓</span>
                  Update Restaurant
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
