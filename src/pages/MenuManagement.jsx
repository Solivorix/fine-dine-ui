import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { itemAPI, restaurantAPI } from '../services/api';
import './MenuManagement.css';

const MenuManagement = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterRestaurant, setFilterRestaurant] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

  // Form uses camelCase to match backend ItemDto
  const [itemForm, setItemForm] = useState({
    productId: '',
    productName: '',
    productDescription: '',
    restaurantId: '',
    itemStatus: 'available',
    imageUrl: '',
    itemCategory: 'main',
    createdBy: 'admin'
  });

  const categories = [
    { value: 'starter', label: 'Starter', icon: '🥗' },
    { value: 'main', label: 'Main Course', icon: '🍽️' },
    { value: 'dessert', label: 'Dessert', icon: '🍰' },
    { value: 'beverage', label: 'Beverage', icon: '🥤' },
    { value: 'appetizer', label: 'Appetizer', icon: '🍤' },
    { value: 'soup', label: 'Soup', icon: '🍲' },
    { value: 'salad', label: 'Salad', icon: '🥬' }
  ];

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
    if (!restaurantId) return 'No Restaurant';
    const restaurant = restaurants.find(r => (r.rest_id || r.restId) === restaurantId);
    return restaurant ? restaurant.name : 'Unknown Restaurant';
  };

  const getCategoryInfo = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat || { value: category, label: category, icon: '🍴' };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setItemForm(prev => ({
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

  const handleRemoveImage = async () => {
    if (!itemForm.imageUrl) return;

    try {
      await fetch(`${API_BASE_URL}/api/upload/image?url=${encodeURIComponent(itemForm.imageUrl)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error deleting image:', err);
    }

    setItemForm(prev => ({
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

  const handleAddItem = async (e) => {
    e.preventDefault();

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
      // Get ID from either item_id (API response) or itemId
      const itemId = selectedItem.item_id || selectedItem.itemId;
      
      const updateData = { 
        ...itemForm, 
        itemId: itemId,
        updatedBy: 'admin' 
      };
      await itemAPI.patch(itemId, updateData);
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
      const item = items.find(i => (i.item_id || i.itemId) === itemId);
      const imageUrl = item?.image_url || item?.imageUrl;
      if (imageUrl) {
        try {
          await fetch(`${API_BASE_URL}/api/upload/image?url=${encodeURIComponent(imageUrl)}`, {
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
      productId: item.product_id || item.productId || '',
      productName: item.product_name || item.productName || '',
      productDescription: item.product_description || item.productDescription || '',
      restaurantId: item.restaurant_id || item.restaurantId || '',
      itemStatus: item.item_status || item.itemStatus || 'available',
      imageUrl: item.image_url || item.imageUrl || '',
      itemCategory: item.item_category || item.itemCategory || 'main',
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
      itemCategory: 'main',
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

  const handleBack = () => {
    navigate(-1);
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const restaurantId = item.restaurant_id || item.restaurantId;
    const productName = item.product_name || item.productName || '';
    const productDescription = item.product_description || item.productDescription || '';
    const matchesRestaurant = filterRestaurant === 'all' || restaurantId === filterRestaurant;
    const matchesSearch = !searchTerm ||
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productDescription.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRestaurant && matchesSearch;
  });

  const availableItems = items.filter(i => (i.item_status || i.itemStatus) === 'available').length;
  const unavailableItems = items.filter(i => (i.item_status || i.itemStatus) === 'unavailable').length;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading menu items...</p>
      </div>
    );
  }

  return (
    <div className="menu-management">
      {/* Header Section */}
      <div className="page-header">
        <div className="header-left">
          <button className="btn-back" onClick={handleBack}>
            <span className="back-icon">←</span>
            <span className="back-text">Back</span>
          </button>
          <div className="header-title">
            <h1>Menu Management</h1>
            <p className="header-subtitle">Manage your restaurant menu items</p>
          </div>
        </div>
        <button className="btn-primary btn-add" onClick={() => setShowAddModal(true)}>
          <span className="btn-icon">+</span>
          Add Menu Item
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
          <span>No restaurants found. Please <a href="/restaurants">add a restaurant</a> first before creating menu items.</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon">🍽️</div>
          <div className="stat-info">
            <span className="stat-value">{items.length}</span>
            <span className="stat-label">Total Items</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <span className="stat-value">{availableItems}</span>
            <span className="stat-label">Available</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏸️</div>
          <div className="stat-info">
            <span className="stat-value">{unavailableItems}</span>
            <span className="stat-label">Unavailable</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏪</div>
          <div className="stat-info">
            <span className="stat-value">{restaurants.length}</span>
            <span className="stat-label">Restaurants</span>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search menu items..."
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
            {restaurants.map(restaurant => {
              const id = restaurant.rest_id || restaurant.restId;
              return (
                <option key={id} value={id}>
                  {restaurant.name}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Items Grid */}
      <div className="items-grid">
        {filteredItems.length === 0 ? (
          <div className="no-items">
            <div className="no-items-icon">🍽️</div>
            <h3>No menu items found</h3>
            <p>Add your first menu item to get started!</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const id = item.item_id || item.itemId;
            const imageUrl = item.image_url || item.imageUrl;
            const productName = item.product_name || item.productName;
            const productId = item.product_id || item.productId;
            const productDescription = item.product_description || item.productDescription;
            const itemCategory = item.item_category || item.itemCategory;
            const itemStatus = item.item_status || item.itemStatus;
            const restaurantId = item.restaurant_id || item.restaurantId;
            
            return (
            <div key={id} className="item-card">
              <div className="card-image">
                {imageUrl ? (
                  <img
                    src={getImageUrl(imageUrl)}
                    alt={productName}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="image-placeholder" style={{ display: imageUrl ? 'none' : 'flex' }}>
                  <span>{getCategoryInfo(itemCategory).icon}</span>
                </div>
                <span className={`status-badge ${itemStatus}`}>
                  {itemStatus}
                </span>
                <span className="category-badge">
                  {getCategoryInfo(itemCategory).icon} {getCategoryInfo(itemCategory).label}
                </span>
              </div>
              <div className="card-content">
                <h3 className="item-name">{productName}</h3>
                <p className="item-id">ID: {productId}</p>
                {productDescription && (
                  <p className="item-description">{productDescription}</p>
                )}
                <div className="item-restaurant">
                  <span className="restaurant-icon">🏪</span>
                  {getRestaurantName(restaurantId)}
                </div>
                <div className="card-actions">
                  <button
                    className="btn-action btn-edit"
                    onClick={() => openEditModal(item)}
                  >
                    <span>✏️</span> Edit
                  </button>
                  <button
                    className="btn-action btn-delete"
                    onClick={() => handleDeleteItem(id)}
                  >
                    <span>🗑️</span> Delete
                  </button>
                </div>
              </div>
            </div>
          )})
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
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="restaurantId">
                    <span className="label-icon">🏪</span>
                    Restaurant *
                  </label>
                  <select
                    id="restaurantId"
                    name="restaurantId"
                    value={itemForm.restaurantId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select a restaurant</option>
                    {restaurants.map(restaurant => {
                      const rId = restaurant.rest_id || restaurant.restId;
                      return (
                        <option key={rId} value={rId}>
                          {restaurant.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="itemCategory">
                    <span className="label-icon">📂</span>
                    Category
                  </label>
                  <select
                    id="itemCategory"
                    name="itemCategory"
                    value={itemForm.itemCategory}
                    onChange={handleInputChange}
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="productId">
                    <span className="label-icon">🏷️</span>
                    Product ID *
                  </label>
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
                  <label htmlFor="itemStatus">
                    <span className="label-icon">📊</span>
                    Status
                  </label>
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
              </div>

              <div className="form-group">
                <label htmlFor="productName">
                  <span className="label-icon">🍽️</span>
                  Product Name *
                </label>
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
                <label htmlFor="productDescription">
                  <span className="label-icon">📝</span>
                  Description
                </label>
                <textarea
                  id="productDescription"
                  name="productDescription"
                  value={itemForm.productDescription}
                  onChange={handleInputChange}
                  placeholder="Enter product description"
                  rows="3"
                />
              </div>

              {/* Image Upload */}
              <div className="form-group">
                <label>
                  <span className="label-icon">🖼️</span>
                  Item Image
                </label>
                <div className="image-upload-container">
                  {itemForm.imageUrl ? (
                    <div className="image-preview">
                      <img src={getImageUrl(itemForm.imageUrl)} alt="Preview" />
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
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit_restaurantId">
                    <span className="label-icon">🏪</span>
                    Restaurant *
                  </label>
                  <select
                    id="edit_restaurantId"
                    name="restaurantId"
                    value={itemForm.restaurantId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select a restaurant</option>
                    {restaurants.map(restaurant => {
                      const rId = restaurant.rest_id || restaurant.restId;
                      return (
                        <option key={rId} value={rId}>
                          {restaurant.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="edit_itemCategory">
                    <span className="label-icon">📂</span>
                    Category
                  </label>
                  <select
                    id="edit_itemCategory"
                    name="itemCategory"
                    value={itemForm.itemCategory}
                    onChange={handleInputChange}
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit_productId">
                    <span className="label-icon">🏷️</span>
                    Product ID *
                  </label>
                  <input
                    type="text"
                    id="edit_productId"
                    name="productId"
                    value={itemForm.productId}
                    onChange={handleInputChange}
                    placeholder="e.g., PROD001"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit_itemStatus">
                    <span className="label-icon">📊</span>
                    Status
                  </label>
                  <select
                    id="edit_itemStatus"
                    name="itemStatus"
                    value={itemForm.itemStatus}
                    onChange={handleInputChange}
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="edit_productName">
                  <span className="label-icon">🍽️</span>
                  Product Name *
                </label>
                <input
                  type="text"
                  id="edit_productName"
                  name="productName"
                  value={itemForm.productName}
                  onChange={handleInputChange}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit_productDescription">
                  <span className="label-icon">📝</span>
                  Description
                </label>
                <textarea
                  id="edit_productDescription"
                  name="productDescription"
                  value={itemForm.productDescription}
                  onChange={handleInputChange}
                  placeholder="Enter product description"
                  rows="3"
                />
              </div>

              {/* Image Upload */}
              <div className="form-group">
                <label>
                  <span className="label-icon">🖼️</span>
                  Item Image
                </label>
                <div className="image-upload-container">
                  {itemForm.imageUrl ? (
                    <div className="image-preview">
                      <img src={getImageUrl(itemForm.imageUrl)} alt="Preview" />
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
