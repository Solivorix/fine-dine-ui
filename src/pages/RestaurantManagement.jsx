import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { restaurantAPI } from '../services/api';
import './RestaurantManagement.css';

const RestaurantManagement = () => {
  const { logout } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [formError, setFormError] = useState('');

  const [restaurantForm, setRestaurantForm] = useState({
    restaurantName: '',
    restaurantAddress: '',
    restaurantPhone: '',
    restaurantEmail: '',
    restaurantDescription: '',
    restaurantImage: '',
    restaurantStatus: 'active',
    openingTime: '09:00',
    closingTime: '22:00',
    restaurantType: 'casual_dining'
  });

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await restaurantAPI.getAll();
      setRestaurants(response.data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRestaurantForm({
      restaurantName: '',
      restaurantAddress: '',
      restaurantPhone: '',
      restaurantEmail: '',
      restaurantDescription: '',
      restaurantImage: '',
      restaurantStatus: 'active',
      openingTime: '09:00',
      closingTime: '22:00',
      restaurantType: 'casual_dining'
    });
    setFormError('');
  };

  const handleAddRestaurant = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!restaurantForm.restaurantName.trim()) {
      setFormError('Restaurant name is required');
      return;
    }

    if (!restaurantForm.restaurantPhone.trim()) {
      setFormError('Phone number is required');
      return;
    }

    setLoading(true);

    try {
      await restaurantAPI.create({
        restaurant_name: restaurantForm.restaurantName,
        restaurant_address: restaurantForm.restaurantAddress,
        restaurant_phone: restaurantForm.restaurantPhone,
        restaurant_email: restaurantForm.restaurantEmail,
        restaurant_description: restaurantForm.restaurantDescription,
        restaurant_image: restaurantForm.restaurantImage,
        restaurant_status: restaurantForm.restaurantStatus,
        opening_time: restaurantForm.openingTime,
        closing_time: restaurantForm.closingTime,
        restaurant_type: restaurantForm.restaurantType
      });

      alert('Restaurant added successfully!');
      setShowAddModal(false);
      resetForm();
      fetchRestaurants();
    } catch (error) {
      console.error('Error adding restaurant:', error);
      setFormError(error.response?.data?.message || 'Failed to add restaurant');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRestaurant = async (e) => {
    e.preventDefault();
    setFormError('');

    setLoading(true);

    try {
      await restaurantAPI.patch(selectedRestaurant.restaurantId || selectedRestaurant.restaurant_id, {
        restaurant_name: restaurantForm.restaurantName,
        restaurant_address: restaurantForm.restaurantAddress,
        restaurant_phone: restaurantForm.restaurantPhone,
        restaurant_email: restaurantForm.restaurantEmail,
        restaurant_description: restaurantForm.restaurantDescription,
        restaurant_image: restaurantForm.restaurantImage,
        restaurant_status: restaurantForm.restaurantStatus,
        opening_time: restaurantForm.openingTime,
        closing_time: restaurantForm.closingTime,
        restaurant_type: restaurantForm.restaurantType
      });

      alert('Restaurant updated successfully!');
      setShowEditModal(false);
      fetchRestaurants();
    } catch (error) {
      console.error('Error updating restaurant:', error);
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
    setRestaurantForm({
      restaurantName: restaurant.restaurantName || restaurant.restaurant_name,
      restaurantAddress: restaurant.restaurantAddress || restaurant.restaurant_address || '',
      restaurantPhone: restaurant.restaurantPhone || restaurant.restaurant_phone || '',
      restaurantEmail: restaurant.restaurantEmail || restaurant.restaurant_email || '',
      restaurantDescription: restaurant.restaurantDescription || restaurant.restaurant_description || '',
      restaurantImage: restaurant.restaurantImage || restaurant.restaurant_image || '',
      restaurantStatus: restaurant.restaurantStatus || restaurant.restaurant_status || 'active',
      openingTime: restaurant.openingTime || restaurant.opening_time || '09:00',
      closingTime: restaurant.closingTime || restaurant.closing_time || '22:00',
      restaurantType: restaurant.restaurantType || restaurant.restaurant_type || 'casual_dining'
    });
    setShowEditModal(true);
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
          {/* Add Restaurant Button */}
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
                  key={restaurant.restaurantId || restaurant.restaurant_id}
                  className="restaurant-card card"
                  style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                >
                  <div className="restaurant-image">
                    {restaurant.restaurantImage || restaurant.restaurant_image ? (
                      <img 
                        src={restaurant.restaurantImage || restaurant.restaurant_image} 
                        alt={restaurant.restaurantName || restaurant.restaurant_name} 
                      />
                    ) : (
                      <div className="placeholder-image">
                        <span>🏪</span>
                      </div>
                    )}
                    <span className={`status-badge ${restaurant.restaurantStatus || restaurant.restaurant_status}`}>
                      {restaurant.restaurantStatus || restaurant.restaurant_status}
                    </span>
                  </div>

                  <div className="restaurant-content">
                    <h3>{restaurant.restaurantName || restaurant.restaurant_name}</h3>
                    
                    <div className="restaurant-info">
                      <div className="info-item">
                        <span className="icon">📍</span>
                        <span className="text">
                          {restaurant.restaurantAddress || restaurant.restaurant_address || 'No address'}
                        </span>
                      </div>

                      <div className="info-item">
                        <span className="icon">📞</span>
                        <span className="text">
                          {restaurant.restaurantPhone || restaurant.restaurant_phone || 'No phone'}
                        </span>
                      </div>

                      {(restaurant.restaurantEmail || restaurant.restaurant_email) && (
                        <div className="info-item">
                          <span className="icon">✉️</span>
                          <span className="text">
                            {restaurant.restaurantEmail || restaurant.restaurant_email}
                          </span>
                        </div>
                      )}

                      <div className="info-item">
                        <span className="icon">🕐</span>
                        <span className="text">
                          {restaurant.openingTime || restaurant.opening_time} - {restaurant.closingTime || restaurant.closing_time}
                        </span>
                      </div>

                      <div className="info-item">
                        <span className="badge">{restaurant.restaurantType || restaurant.restaurant_type}</span>
                      </div>
                    </div>

                    {(restaurant.restaurantDescription || restaurant.restaurant_description) && (
                      <p className="restaurant-description">
                        {restaurant.restaurantDescription || restaurant.restaurant_description}
                      </p>
                    )}

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
                        onClick={() => handleDeleteRestaurant(restaurant.restaurantId || restaurant.restaurant_id)}
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

              <div className="form-section">
                <h3>Basic Information</h3>

                <div className="input-group">
                  <label className="input-label">Restaurant Name *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., The Golden Spoon"
                    value={restaurantForm.restaurantName}
                    onChange={(e) => setRestaurantForm({...restaurantForm, restaurantName: e.target.value})}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Description</label>
                  <textarea
                    className="textarea"
                    placeholder="Brief description of your restaurant"
                    value={restaurantForm.restaurantDescription}
                    onChange={(e) => setRestaurantForm({...restaurantForm, restaurantDescription: e.target.value})}
                    rows="3"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Address</label>
                  <textarea
                    className="textarea"
                    placeholder="Full restaurant address"
                    value={restaurantForm.restaurantAddress}
                    onChange={(e) => setRestaurantForm({...restaurantForm, restaurantAddress: e.target.value})}
                    rows="2"
                  />
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Phone Number *</label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="e.g., +91 1234567890"
                      value={restaurantForm.restaurantPhone}
                      onChange={(e) => setRestaurantForm({...restaurantForm, restaurantPhone: e.target.value})}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Email</label>
                    <input
                      type="email"
                      className="input"
                      placeholder="restaurant@example.com"
                      value={restaurantForm.restaurantEmail}
                      onChange={(e) => setRestaurantForm({...restaurantForm, restaurantEmail: e.target.value})}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Image URL (optional)</label>
                  <input
                    type="url"
                    className="input"
                    placeholder="https://example.com/restaurant-image.jpg"
                    value={restaurantForm.restaurantImage}
                    onChange={(e) => setRestaurantForm({...restaurantForm, restaurantImage: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Operating Details</h3>

                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Restaurant Type</label>
                    <select
                      className="select"
                      value={restaurantForm.restaurantType}
                      onChange={(e) => setRestaurantForm({...restaurantForm, restaurantType: e.target.value})}
                    >
                      <option value="fine_dining">Fine Dining</option>
                      <option value="casual_dining">Casual Dining</option>
                      <option value="fast_food">Fast Food</option>
                      <option value="cafe">Café</option>
                      <option value="buffet">Buffet</option>
                      <option value="food_court">Food Court</option>
                      <option value="cloud_kitchen">Cloud Kitchen</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Status</label>
                    <select
                      className="select"
                      value={restaurantForm.restaurantStatus}
                      onChange={(e) => setRestaurantForm({...restaurantForm, restaurantStatus: e.target.value})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="temporarily_closed">Temporarily Closed</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Opening Time</label>
                    <input
                      type="time"
                      className="input"
                      value={restaurantForm.openingTime}
                      onChange={(e) => setRestaurantForm({...restaurantForm, openingTime: e.target.value})}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Closing Time</label>
                    <input
                      type="time"
                      className="input"
                      value={restaurantForm.closingTime}
                      onChange={(e) => setRestaurantForm({...restaurantForm, closingTime: e.target.value})}
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

              <div className="form-section">
                <h3>Basic Information</h3>

                <div className="input-group">
                  <label className="input-label">Restaurant Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={restaurantForm.restaurantName}
                    onChange={(e) => setRestaurantForm({...restaurantForm, restaurantName: e.target.value})}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Description</label>
                  <textarea
                    className="textarea"
                    value={restaurantForm.restaurantDescription}
                    onChange={(e) => setRestaurantForm({...restaurantForm, restaurantDescription: e.target.value})}
                    rows="3"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Address</label>
                  <textarea
                    className="textarea"
                    value={restaurantForm.restaurantAddress}
                    onChange={(e) => setRestaurantForm({...restaurantForm, restaurantAddress: e.target.value})}
                    rows="2"
                  />
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Phone Number *</label>
                    <input
                      type="tel"
                      className="input"
                      value={restaurantForm.restaurantPhone}
                      onChange={(e) => setRestaurantForm({...restaurantForm, restaurantPhone: e.target.value})}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Email</label>
                    <input
                      type="email"
                      className="input"
                      value={restaurantForm.restaurantEmail}
                      onChange={(e) => setRestaurantForm({...restaurantForm, restaurantEmail: e.target.value})}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Image URL</label>
                  <input
                    type="url"
                    className="input"
                    value={restaurantForm.restaurantImage}
                    onChange={(e) => setRestaurantForm({...restaurantForm, restaurantImage: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Operating Details</h3>

                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Restaurant Type</label>
                    <select
                      className="select"
                      value={restaurantForm.restaurantType}
                      onChange={(e) => setRestaurantForm({...restaurantForm, restaurantType: e.target.value})}
                    >
                      <option value="fine_dining">Fine Dining</option>
                      <option value="casual_dining">Casual Dining</option>
                      <option value="fast_food">Fast Food</option>
                      <option value="cafe">Café</option>
                      <option value="buffet">Buffet</option>
                      <option value="food_court">Food Court</option>
                      <option value="cloud_kitchen">Cloud Kitchen</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Status</label>
                    <select
                      className="select"
                      value={restaurantForm.restaurantStatus}
                      onChange={(e) => setRestaurantForm({...restaurantForm, restaurantStatus: e.target.value})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="temporarily_closed">Temporarily Closed</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Opening Time</label>
                    <input
                      type="time"
                      className="input"
                      value={restaurantForm.openingTime}
                      onChange={(e) => setRestaurantForm({...restaurantForm, openingTime: e.target.value})}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Closing Time</label>
                    <input
                      type="time"
                      className="input"
                      value={restaurantForm.closingTime}
                      onChange={(e) => setRestaurantForm({...restaurantForm, closingTime: e.target.value})}
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
