import React, { useState, useEffect, useRef } from 'react';
import { itemAPI, restaurantAPI } from '../services/api';
import './MenuManagement.css';

const MenuManagement = () => {
  const [items, setItems] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterRestaurant, setFilterRestaurant] = useState('all');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [itemForm, setItemForm] = useState({
    productId: '',
    productName: '',
    productDescription: '',
    restaurantId: '',
    itemStatus: 'available',
    imageUrl: '',
    createdBy: 'admin'
  });

  // Base URL for API - adjust based on your environment
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

  useEffect(() => {
    fetchItems();
    fetchRestaurants();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await itemAPI.getAll();
      setItems(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch menu items');
      console.error('Error fetching items:', err);
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
    const restaurant = restaurants.find(r => r.restId === restaurantId || r.rest_id === restaurantId);
    return restaurant ? restaurant.name : 'Unknown Restaurant';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setItemForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle image file selection and upload
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (JPG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/upload/item-image`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success === 'true' || result.success === true) {
        setItemForm(prev => ({
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

  // Remove uploaded image
  const handleRemoveImage = async () => {
    if (!itemForm.imageUrl) return;

    try {
      // Call delete API
      await fetch(`${API_BASE_URL}/api/upload/image?url=${encodeURIComponent(itemForm.imageUrl)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error deleting image:', err);
    }

    // Clear the image from form regardless of API result
    setItemForm(prev => ({
      ...prev,
      imageUrl: ''
    }));

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get full image URL for display
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${API_BASE_URL}${imageUrl}`;
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!itemForm.restaurantId) {
      alert('Please select a restaurant');
      return;
    }
    
    if (!itemForm.productName.trim()) {
      alert('Please enter a product name');
      return;
    }

    if (!itemForm.productId.trim()) {
      alert('Please enter a product ID');
      return;
    }

    try {
      // API expects an array for createItems
      await itemAPI.create([itemForm]);
      setShowAddModal(false);
      resetForm();
      fetchItems();
    } catch (err) {
      console.error('Error creating item:', err);
      alert('Failed to create item. Please try again.');
    }
  };

  const handleEditItem = async (e) => {
    e.preventDefault();
    
    if (!selectedItem) return;

    try {
      await itemAPI.update(selectedItem.itemId, itemForm);
      setShowEditModal(false);
      setSelectedItem(null);
      resetForm();
      fetchItems();
    } catch (err) {
      console.error('Error updating item:', err);
      alert('Failed to update item. Please try again.');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      // Find item to get imageUrl for cleanup
      const item = items.find(i => i.itemId === itemId);
      if (item?.imageUrl) {
        // Try to delete the image file
        try {
          await fetch(`${API_BASE_URL}/api/upload/image?url=${encodeURIComponent(item.imageUrl)}`, {
            method: 'DELETE',
          });
        } catch (err) {
          console.error('Error deleting image:', err);
        }
      }

      await itemAPI.delete(itemId);
      fetchItems();
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item. Please try again.');
    }
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setItemForm({
      productId: item.productId || '',
      productName: item.productName || '',
      productDescription: item.productDescription || '',
      restaurantId: item.restaurantId || '',
      itemStatus: item.itemStatus || 'available',
      imageUrl: item.imageUrl || '',
      updatedBy: 'admin'
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setItemForm({
      productId: '',
      productName: '',
      productDescription: '',
      restaurantId: '',
      itemStatus: 'available',
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
    setSelectedItem(null);
    resetForm();
  };

  // Filter items by restaurant
  const filteredItems = filterRestaurant === 'all' 
    ? items 
    : items.filter(item => item.restaurantId === filterRestaurant);

  if (loading) {
    return <div className="loading">Loading menu items...</div>;
  }

  return (
    <div className="menu-management">
      <div className="page-header">
        <h1>Menu Management</h1>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          + Add Menu Item
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {restaurants.length === 0 && (
        <div className="alert-warning">
          <span className="alert-icon">⚠️</span>
          <span>No restaurants found. Please <a href="/restaurants">add a restaurant</a> first before creating menu items.</span>
        </div>
      )}

      {/* Restaurant Filter */}
      <div className="filter-section">
        <label htmlFor="filterRestaurant">Filter by Restaurant:</label>
        <select
          id="filterRestaurant"
          value={filterRestaurant}
          onChange={(e) => setFilterRestaurant(e.target.value)}
          className="restaurant-filter"
        >
          <option value="all">All Restaurants</option>
          {restaurants.map(restaurant => (
            <option key={restaurant.restId || restaurant.rest_id} value={restaurant.restId || restaurant.rest_id}>
              {restaurant.name}
            </option>
          ))}
        </select>
      </div>

      {/* Items Grid */}
      <div className="items-grid">
        {filteredItems.length === 0 ? (
          <div className="no-items">No menu items found. Add your first item!</div>
        ) : (
          filteredItems.map(item => (
            <div key={item.itemId} className="item-card">
              {item.imageUrl && (
                <div className="item-image">
                  <img 
                    src={getImageUrl(item.imageUrl)} 
                    alt={item.productName}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="item-content">
                <h3>{item.productName}</h3>
                <p className="item-description">{item.productDescription || 'No description'}</p>
                <div className="item-meta">
                  <span className={`status-badge ${item.itemStatus}`}>
                    {item.itemStatus}
                  </span>
                  <span className="item-restaurant">
                    {getRestaurantName(item.restaurantId)}
                  </span>
                </div>
                <div className="item-actions">
                  <button 
                    className="btn-edit" 
                    onClick={() => openEditModal(item)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-delete" 
                    onClick={() => handleDeleteItem(item.itemId)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Menu Item</h2>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleAddItem}>
              <div className="form-group">
                <label htmlFor="restaurantId">Restaurant *</label>
                <select
                  id="restaurantId"
                  name="restaurantId"
                  value={itemForm.restaurantId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select a restaurant</option>
                  {restaurants.map(restaurant => (
                    <option key={restaurant.restId || restaurant.rest_id} value={restaurant.restId || restaurant.rest_id}>
                      {restaurant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="productId">Product ID *</label>
                <input
                  type="text"
                  id="productId"
                  name="productId"
                  value={itemForm.productId}
                  onChange={handleInputChange}
                  placeholder="e.g., PROD001"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="productName">Product Name *</label>
                <input
                  type="text"
                  id="productName"
                  name="productName"
                  value={itemForm.productName}
                  onChange={handleInputChange}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="productDescription">Description</label>
                <textarea
                  id="productDescription"
                  name="productDescription"
                  value={itemForm.productDescription}
                  onChange={handleInputChange}
                  placeholder="Enter product description"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="itemStatus">Status</label>
                <select
                  id="itemStatus"
                  name="itemStatus"
                  value={itemForm.itemStatus}
                  onChange={handleInputChange}
                >
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              {/* Image Upload Section */}
              <div className="form-group">
                <label>Item Image</label>
                <div className="image-upload-container">
                  {itemForm.imageUrl ? (
                    <div className="image-preview">
                      <img 
                        src={getImageUrl(itemForm.imageUrl)} 
                        alt="Preview" 
                      />
                      <button 
                        type="button" 
                        className="btn-remove-image"
                        onClick={handleRemoveImage}
                      >
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
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Menu Item</h2>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleEditItem}>
              <div className="form-group">
                <label htmlFor="editRestaurantId">Restaurant *</label>
                <select
                  id="editRestaurantId"
                  name="restaurantId"
                  value={itemForm.restaurantId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select a restaurant</option>
                  {restaurants.map(restaurant => (
                    <option key={restaurant.restId || restaurant.rest_id} value={restaurant.restId || restaurant.rest_id}>
                      {restaurant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="editProductId">Product ID *</label>
                <input
                  type="text"
                  id="editProductId"
                  name="productId"
                  value={itemForm.productId}
                  onChange={handleInputChange}
                  placeholder="e.g., PROD001"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="editProductName">Product Name *</label>
                <input
                  type="text"
                  id="editProductName"
                  name="productName"
                  value={itemForm.productName}
                  onChange={handleInputChange}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="editProductDescription">Description</label>
                <textarea
                  id="editProductDescription"
                  name="productDescription"
                  value={itemForm.productDescription}
                  onChange={handleInputChange}
                  placeholder="Enter product description"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="editItemStatus">Status</label>
                <select
                  id="editItemStatus"
                  name="itemStatus"
                  value={itemForm.itemStatus}
                  onChange={handleInputChange}
                >
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              {/* Image Upload Section */}
              <div className="form-group">
                <label>Item Image</label>
                <div className="image-upload-container">
                  {itemForm.imageUrl ? (
                    <div className="image-preview">
                      <img 
                        src={getImageUrl(itemForm.imageUrl)} 
                        alt="Preview" 
                      />
                      <button 
                        type="button" 
                        className="btn-remove-image"
                        onClick={handleRemoveImage}
                      >
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
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
