import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { itemAPI, priceAPI, restaurantAPI, uploadAPI } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faSync, faUtensils, faBox, faCircle, faMoneyBill,
  faSearch, faStore, faPen, faTrash, faPlus, faCamera, faSave,
  faTimes, faTag, faSeedling, faCake, faWineGlass, faShrimp, faBowlFood,
  faLeaf, faPizzaSlice, faBurger, faFish, faFire, faCoffee, faBreadSlice,
  faBowlRice, faHourglass, faStickyNote
} from '@fortawesome/free-solid-svg-icons';
import './MenuManagement.css';

const MenuManagement = () => {
  const navigate = useNavigate();
  const { isAdmin, getUserRestaurantId } = useAuth();
  const [items, setItems] = useState([]);
  const [prices, setPrices] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItemForPrice, setSelectedItemForPrice] = useState(null);
  const [editingPrice, setEditingPrice] = useState(null);

  // For non-admin users, default to their restaurant
  const userRestaurantId = getUserRestaurantId();

  // Filters
  const [filterRestaurant, setFilterRestaurant] = useState(userRestaurantId || 'all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterFoodType, setFilterFoodType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Image upload
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

  // Predefined categories
  const categories = [
    'starter', 'main', 'dessert', 'beverage', 'appetizer', 
    'soup', 'salad', 'pizza', 'burger', 'pasta', 
    'seafood', 'grill', 'breakfast', 'sandwich', 'biryani',
    'chinese', 'indian', 'continental', 'snacks', 'other'
  ];

  // Food types
  const foodTypes = [
    { value: 'veg', label: 'Vegetarian', icon: faCircle, color: '#22c55e' },
    { value: 'non-veg', label: 'Non-Vegetarian', icon: faCircle, color: '#ef4444' },
    { value: 'egg', label: 'Contains Egg', icon: faCircle, color: '#eab308' }
  ];

  // Portion sizes
  const portionSizes = [
    'small', 'regular', 'medium', 'large', 'extra-large', 
    'half', 'full', 'quarter', 'single', 'double'
  ];

  // Item form - uses camelCase (matches ItemDto)
  const [itemForm, setItemForm] = useState({
    productId: '',
    productName: '',
    productDescription: '',
    restaurantId: '',
    itemStatus: 'available',
    itemCategory: '',
    foodType: 'veg',
    imageUrl: ''
  });

  // Price form - will be converted to snake_case when sending (matches PriceDto)
  const [priceForm, setPriceForm] = useState({
    portionSize: 'regular',
    price: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, pricesRes, restaurantsRes] = await Promise.all([
        itemAPI.getAll(),
        priceAPI.getAll(),
        restaurantAPI.getAll()
      ]);
      console.log('Items:', itemsRes.data);
      console.log('Prices:', pricesRes.data);
      console.log('Restaurants:', restaurantsRes.data);
      setItems(itemsRes.data || []);
      setPrices(pricesRes.data || []);
      setRestaurants(restaurantsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get Item field (camelCase)
  const getItemField = (item, field) => {
    if (!item) return undefined;
    return item[field];
  };

  // Helper to get Price field (snake_case from backend)
  const getPriceField = (price, field) => {
    if (!price) return undefined;
    const snakeCase = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    return price[field] !== undefined ? price[field] : price[snakeCase];
  };

  // Helper to get Restaurant field
  const getRestField = (rest, field) => {
    if (!rest) return undefined;
    const snakeCase = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    return rest[field] !== undefined ? rest[field] : rest[snakeCase];
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;

    try {
      setUploadingImage(true);
      const response = await uploadAPI.uploadItemImage(imageFile);
      console.log('Upload response:', response.data);
      
      // Backend returns { success: "true", fileUrl: "...", message: "..." }
      // IMPORTANT: Must use 'fileUrl' - that's what the backend returns!
      let imageUrl = null;
      if (response.data) {
        imageUrl = response.data.fileUrl || response.data.imageUrl || response.data.url || response.data.path;
      }
      
      // Ensure it's a string, not an object
      if (imageUrl && typeof imageUrl !== 'string') {
        console.error('imageUrl is not a string:', imageUrl);
        imageUrl = null;
      }
      
      console.log('Image URL:', imageUrl, 'type:', typeof imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image: ' + (error.response?.data?.message || error.message));
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    try {
      let imageUrl = itemForm.imageUrl;

      // Upload image first if selected
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl && typeof uploadedUrl === 'string') {
          imageUrl = uploadedUrl;
        }
      }

      // SAFETY: Ensure imageUrl is a string or null
      const safeImageUrl = (imageUrl && typeof imageUrl === 'string') ? imageUrl : null;

      // Prepare item data (camelCase for ItemDto)
      const itemData = {
        productId: itemForm.productId,
        productName: itemForm.productName,
        productDescription: itemForm.productDescription,
        restaurantId: itemForm.restaurantId,
        itemStatus: itemForm.itemStatus,
        itemCategory: itemForm.itemCategory,
        foodType: itemForm.foodType,
        imageUrl: safeImageUrl
      };

      // Remove null fields
      if (!itemData.imageUrl) {
        delete itemData.imageUrl;
      }

      console.log('Submitting item:', itemData);
      console.log('imageUrl type:', typeof itemData.imageUrl);

      if (editingItem) {
        const editItemId = getItemField(editingItem, 'itemId');
        await itemAPI.update(editItemId, itemData);
      } else {
        // Create expects an array
        await itemAPI.create([itemData]);
      }

      fetchData();
      resetItemForm();
      setShowItemModal(false);
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item: ' + (error.response?.data?.message || error.message));
    }
  };

  const handlePriceSubmit = async (e) => {
    e.preventDefault();
    try {
      // PriceDto uses snake_case
      const priceData = {
        item_id: getItemField(selectedItemForPrice, 'itemId'),
        restaurant_id: getItemField(selectedItemForPrice, 'restaurantId'),
        portion_size: priceForm.portionSize,
        price: parseFloat(priceForm.price)
      };

      console.log('Submitting price:', priceData);

      if (editingPrice) {
        const priceId = getPriceField(editingPrice, 'priceId');
        await priceAPI.update(priceId, priceData);
      } else {
        await priceAPI.create(priceData);
      }
      
      fetchData();
      setShowPriceModal(false);
      resetPriceForm();
    } catch (error) {
      console.error('Error saving price:', error);
      alert('Failed to save price: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      productId: getItemField(item, 'productId') || '',
      productName: getItemField(item, 'productName') || '',
      productDescription: getItemField(item, 'productDescription') || '',
      restaurantId: getItemField(item, 'restaurantId') || '',
      itemStatus: getItemField(item, 'itemStatus') || 'available',
      itemCategory: getItemField(item, 'itemCategory') || '',
      foodType: getItemField(item, 'foodType') || 'veg',
      imageUrl: getItemField(item, 'imageUrl') || ''
    });
    const imageUrl = getItemField(item, 'imageUrl');
    setImagePreview(imageUrl ? getImageUrl(imageUrl) : null);
    setShowItemModal(true);
  };

  const handleEditPrice = (price, item) => {
    setSelectedItemForPrice(item);
    setEditingPrice(price);
    setPriceForm({
      portionSize: getPriceField(price, 'portionSize') || 'regular',
      price: price.price?.toString() || ''
    });
    setShowPriceModal(true);
  };

  const handleAddPrice = (item) => {
    setSelectedItemForPrice(item);
    setEditingPrice(null);
    resetPriceForm();
    setShowPriceModal(true);
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await itemAPI.delete(itemId);
        fetchData();
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item');
      }
    }
  };

  const handleDeletePrice = async (priceId) => {
    if (window.confirm('Are you sure you want to delete this price?')) {
      try {
        await priceAPI.delete(priceId);
        fetchData();
      } catch (error) {
        console.error('Error deleting price:', error);
        alert('Failed to delete price');
      }
    }
  };

  const resetItemForm = () => {
    setEditingItem(null);
    setItemForm({
      productId: '',
      productName: '',
      productDescription: '',
      restaurantId: !isAdmin() && userRestaurantId ? userRestaurantId : '', // Pre-select for non-admin
      itemStatus: 'available',
      itemCategory: '',
      foodType: 'veg',
      imageUrl: ''
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const resetPriceForm = () => {
    setEditingPrice(null);
    setPriceForm({
      portionSize: 'regular',
      price: ''
    });
  };

  const getRestaurantName = (restaurantId) => {
    const restaurant = restaurants.find(r => getRestField(r, 'restId') === restaurantId);
    return restaurant?.name || 'Unknown';
  };

  const getItemPrices = (itemId) => {
    return prices.filter(p => getPriceField(p, 'itemId') === itemId);
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    if (imageUrl.startsWith('/')) return `${API_BASE_URL}${imageUrl}`;
    return `${API_BASE_URL}/${imageUrl}`;
  };

  const getFoodTypeInfo = (foodType) => {
    const type = foodTypes.find(ft => ft.value === foodType);
    return type || { value: foodType, label: foodType, icon: faCircle, color: '#9ca3af' };
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'starter': faSeedling, 'main': faUtensils, 'dessert': faCake, 'beverage': faWineGlass,
      'appetizer': faShrimp, 'soup': faBowlFood, 'salad': faLeaf, 'pizza': faPizzaSlice,
      'burger': faBurger, 'pasta': faBowlFood, 'seafood': faFish, 'grill': faFire,
      'breakfast': faCoffee, 'sandwich': faBreadSlice, 'biryani': faBowlRice, 'chinese': faBowlFood,
      'indian': faUtensils, 'continental': faUtensils, 'snacks': faUtensils, 'other': faUtensils
    };
    return icons[category?.toLowerCase()] || faUtensils;
  };

  // FRONTEND FILTERING
  // For non-admin users, always filter by their restaurant
  const effectiveRestaurantFilter = !isAdmin() && userRestaurantId
    ? userRestaurantId
    : filterRestaurant;

  const filteredItems = items.filter(item => {
    const restaurantId = getItemField(item, 'restaurantId');
    const category = getItemField(item, 'itemCategory');
    const foodType = getItemField(item, 'foodType');
    const status = getItemField(item, 'itemStatus');
    const productName = getItemField(item, 'productName') || '';

    const matchesRestaurant = effectiveRestaurantFilter === 'all' || restaurantId === effectiveRestaurantFilter;
    const matchesCategory = filterCategory === 'all' || category === filterCategory;
    const matchesFoodType = filterFoodType === 'all' || foodType === filterFoodType;
    const matchesStatus = filterStatus === 'all' || status === filterStatus;
    const matchesSearch = searchTerm === '' || productName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesRestaurant && matchesCategory && matchesFoodType && matchesStatus && matchesSearch;
  });

  const availableCategories = [...new Set(items.map(item => getItemField(item, 'itemCategory')).filter(Boolean))];

  if (loading) {
    return (
      <div className="mm-loading">
        <div className="mm-loader"></div>
        <p>Loading menu items...</p>
      </div>
    );
  }

  return (
    <div className="mm-container">
      {/* Header */}
      <header className="mm-header">
        <div className="mm-header-content">
          <div className="mm-header-left">
            <button className="mm-back-btn" onClick={() => navigate('/admin')}>
              <span className="back-icon"><FontAwesomeIcon icon={faArrowLeft} /></span>
              <span className="back-text">Back</span>
            </button>
            <div className="mm-header-title-section">
              <h1><FontAwesomeIcon icon={faUtensils} /> Menu Management</h1>
              <p className="mm-header-subtitle">Manage items and prices</p>
            </div>
          </div>
          <div className="mm-header-actions">
            <button className="mm-refresh-btn" onClick={fetchData}><FontAwesomeIcon icon={faSync} /></button>
            <button className="mm-btn-primary" onClick={() => setShowItemModal(true)}>
              <FontAwesomeIcon icon={faPlus} /> Add Item
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="mm-stats">
        <div className="mm-stat-card">
          <div className="mm-stat-icon"><FontAwesomeIcon icon={faBox} /></div>
          <div className="mm-stat-info">
            <span className="mm-stat-value">{items.length}</span>
            <span className="mm-stat-label">Items</span>
          </div>
        </div>
        <div className="mm-stat-card veg">
          <div className="mm-stat-icon"><FontAwesomeIcon icon={faCircle} style={{color: '#22c55e'}} /></div>
          <div className="mm-stat-info">
            <span className="mm-stat-value">{items.filter(i => getItemField(i, 'foodType') === 'veg').length}</span>
            <span className="mm-stat-label">Veg</span>
          </div>
        </div>
        <div className="mm-stat-card nonveg">
          <div className="mm-stat-icon"><FontAwesomeIcon icon={faCircle} style={{color: '#ef4444'}} /></div>
          <div className="mm-stat-info">
            <span className="mm-stat-value">{items.filter(i => getItemField(i, 'foodType') === 'non-veg').length}</span>
            <span className="mm-stat-label">Non-Veg</span>
          </div>
        </div>
        <div className="mm-stat-card">
          <div className="mm-stat-icon"><FontAwesomeIcon icon={faMoneyBill} /></div>
          <div className="mm-stat-info">
            <span className="mm-stat-value">{prices.length}</span>
            <span className="mm-stat-label">Prices</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mm-filters">
        <div className="mm-search">
          <span className="mm-search-icon"><FontAwesomeIcon icon={faSearch} /></span>
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Restaurant filter - only show dropdown for admin users */}
        {isAdmin() ? (
          <select value={filterRestaurant} onChange={(e) => setFilterRestaurant(e.target.value)}>
            <option value="all">All Restaurants</option>
            {restaurants.map(r => (
              <option key={getRestField(r, 'restId')} value={getRestField(r, 'restId')}>
                {r.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="mm-restaurant-badge">
            <FontAwesomeIcon icon={faStore} />
            {restaurants.find(r => getRestField(r, 'restId') === userRestaurantId)?.name || 'Your Restaurant'}
          </div>
        )}

        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {availableCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select value={filterFoodType} onChange={(e) => setFilterFoodType(e.target.value)}>
          <option value="all">All Types</option>
          {foodTypes.map(ft => (
            <option key={ft.value} value={ft.value}>{ft.label}</option>
          ))}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>

      {/* Items Grid */}
      <main className="mm-main">
        <div className="mm-results-info">
          Showing {filteredItems.length} of {items.length} items
        </div>

        {filteredItems.length === 0 ? (
          <div className="mm-empty">
            <FontAwesomeIcon icon={faUtensils} size="2x" />
            <h3>No Items Found</h3>
            <button className="mm-btn-primary" onClick={() => setShowItemModal(true)}>Add Item</button>
          </div>
        ) : (
          <div className="mm-items-grid">
            {filteredItems.map(item => {
              const itemId = getItemField(item, 'itemId');
              const productName = getItemField(item, 'productName');
              const productDescription = getItemField(item, 'productDescription');
              const restaurantId = getItemField(item, 'restaurantId');
              const imageUrl = getItemField(item, 'imageUrl');
              const itemCategory = getItemField(item, 'itemCategory');
              const foodType = getItemField(item, 'foodType');
              const itemStatus = getItemField(item, 'itemStatus');
              const itemPrices = getItemPrices(itemId);
              const foodTypeInfo = getFoodTypeInfo(foodType);

              return (
                <div key={itemId} className={`mm-item-card ${itemStatus !== 'available' ? 'unavailable' : ''}`}>
                  {/* Food Type Badge */}
                  <div className={`mm-food-type-badge ${foodType || ''}`}>
                    <FontAwesomeIcon icon={foodTypeInfo.icon} style={{color: foodTypeInfo.color}} />
                  </div>

                  {/* Item Image */}
                  <div className="mm-item-image">
                    {imageUrl ? (
                      <img 
                        src={getImageUrl(imageUrl)} 
                        alt={productName}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="mm-item-placeholder">
                        <FontAwesomeIcon icon={getCategoryIcon(itemCategory)} />
                      </div>
                    )}
                    {itemStatus !== 'available' && (
                      <div className="mm-status-overlay">{itemStatus}</div>
                    )}
                  </div>

                  {/* Item Content */}
                  <div className="mm-item-content">
                    <h3>{productName}</h3>
                    {productDescription && <p className="mm-item-desc">{productDescription}</p>}
                    
                    <div className="mm-item-meta">
                      <span><FontAwesomeIcon icon={faStore} /> {getRestaurantName(restaurantId)}</span>
                      {itemCategory && <span><FontAwesomeIcon icon={getCategoryIcon(itemCategory)} /> {itemCategory}</span>}
                    </div>

                    {/* Prices */}
                    <div className="mm-item-prices">
                      <div className="mm-prices-header">
                        <span><FontAwesomeIcon icon={faMoneyBill} /> Prices</span>
                        <button className="mm-btn-add-price" onClick={() => handleAddPrice(item)}>
                          <FontAwesomeIcon icon={faPlus} /> Add
                        </button>
                      </div>
                      {itemPrices.length > 0 ? (
                        <div className="mm-prices-list">
                          {itemPrices.map(price => {
                            const priceId = getPriceField(price, 'priceId');
                            const portionSize = getPriceField(price, 'portionSize');
                            return (
                              <div key={priceId} className="mm-price-tag">
                                <div className="mm-price-info">
                                  <span className="mm-price-portion">{portionSize}</span>
                                  <span className="mm-price-amount">₹{price.price}</span>
                                </div>
                                <div className="mm-price-actions">
                                  <button onClick={() => handleEditPrice(price, item)}><FontAwesomeIcon icon={faPen} /></button>
                                  <button onClick={() => handleDeletePrice(priceId)}><FontAwesomeIcon icon={faTrash} /></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mm-no-prices">No prices set</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mm-item-actions">
                      <button className="mm-btn-edit" onClick={() => handleEditItem(item)}><FontAwesomeIcon icon={faPen} /> Edit</button>
                      <button className="mm-btn-delete" onClick={() => handleDeleteItem(itemId)}><FontAwesomeIcon icon={faTrash} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Item Modal */}
      {showItemModal && (
        <div className="mm-modal-overlay" onClick={() => { setShowItemModal(false); resetItemForm(); }}>
          <div className="mm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mm-modal-header">
              <h2>{editingItem ? <><FontAwesomeIcon icon={faPen} /> Edit Item</> : <><FontAwesomeIcon icon={faPlus} /> Add Item</>}</h2>
              <button className="mm-modal-close" onClick={() => { setShowItemModal(false); resetItemForm(); }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>

            <form onSubmit={handleItemSubmit} className="mm-modal-form">
              {/* Image Upload */}
              <div className="mm-form-section">
                <h3><FontAwesomeIcon icon={faCamera} /> Image</h3>
                <div className="mm-image-upload">
                  {imagePreview ? (
                    <div className="mm-image-preview">
                      <img src={imagePreview} alt="Preview" />
                      <button type="button" className="mm-remove-image" onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        setItemForm({...itemForm, imageUrl: ''});
                      }}><FontAwesomeIcon icon={faTimes} /></button>
                    </div>
                  ) : (
                    <label className="mm-upload-area">
                      <input type="file" accept="image/*" onChange={handleImageChange} hidden />
                      <FontAwesomeIcon icon={faCamera} />
                      <span>Click to upload</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="mm-form-section">
                <h3><FontAwesomeIcon icon={faStickyNote} /> Basic Info</h3>
                <div className="mm-form-row">
                  <div className="mm-form-group">
                    <label>Product ID *</label>
                    <input
                      type="text"
                      value={itemForm.productId}
                      onChange={(e) => setItemForm({ ...itemForm, productId: e.target.value })}
                      placeholder="PROD001"
                      required
                    />
                  </div>
                  <div className="mm-form-group">
                    <label>Restaurant *</label>
                    {isAdmin() ? (
                      <select
                        value={itemForm.restaurantId}
                        onChange={(e) => setItemForm({ ...itemForm, restaurantId: e.target.value })}
                        required
                      >
                        <option value="">Select</option>
                        {restaurants.map(r => (
                          <option key={getRestField(r, 'restId')} value={getRestField(r, 'restId')}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mm-restaurant-display">
                        {restaurants.find(r => getRestField(r, 'restId') === userRestaurantId)?.name || 'Your Restaurant'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mm-form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={itemForm.productName}
                    onChange={(e) => setItemForm({ ...itemForm, productName: e.target.value })}
                    placeholder="Enter name"
                    required
                  />
                </div>

                <div className="mm-form-group">
                  <label>Description</label>
                  <textarea
                    value={itemForm.productDescription}
                    onChange={(e) => setItemForm({ ...itemForm, productDescription: e.target.value })}
                    placeholder="Optional description"
                    rows={2}
                  />
                </div>
              </div>

              {/* Category & Type */}
              <div className="mm-form-section">
                <h3><FontAwesomeIcon icon={faTag} /> Category & Type</h3>
                <div className="mm-form-row">
                  <div className="mm-form-group">
                    <label>Category *</label>
                    <select
                      value={itemForm.itemCategory}
                      onChange={(e) => setItemForm({ ...itemForm, itemCategory: e.target.value })}
                      required
                    >
                      <option value="">Select</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mm-form-group">
                    <label>Status</label>
                    <select
                      value={itemForm.itemStatus}
                      onChange={(e) => setItemForm({ ...itemForm, itemStatus: e.target.value })}
                    >
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                </div>

                <div className="mm-form-group">
                  <label>Food Type *</label>
                  <div className="mm-food-type-options">
                    {foodTypes.map(ft => (
                      <label key={ft.value} className={`mm-food-type-option ${itemForm.foodType === ft.value ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="foodType"
                          value={ft.value}
                          checked={itemForm.foodType === ft.value}
                          onChange={(e) => setItemForm({ ...itemForm, foodType: e.target.value })}
                        />
                        <FontAwesomeIcon icon={ft.icon} style={{color: ft.color}} />
                        <span>{ft.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mm-modal-footer">
                <button type="button" className="mm-btn-secondary" onClick={() => { setShowItemModal(false); resetItemForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="mm-btn-primary" disabled={uploadingImage}>
                  {uploadingImage ? <><FontAwesomeIcon icon={faHourglass} /> Uploading...</> : editingItem ? <><FontAwesomeIcon icon={faSave} /> Update</> : <><FontAwesomeIcon icon={faPlus} /> Create</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price Modal */}
      {showPriceModal && (
        <div className="mm-modal-overlay" onClick={() => { setShowPriceModal(false); resetPriceForm(); }}>
          <div className="mm-modal mm-modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="mm-modal-header">
              <h2>{editingPrice ? <><FontAwesomeIcon icon={faPen} /> Edit Price</> : <><FontAwesomeIcon icon={faMoneyBill} /> Add Price</>}</h2>
              <button className="mm-modal-close" onClick={() => { setShowPriceModal(false); resetPriceForm(); }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>

            <form onSubmit={handlePriceSubmit} className="mm-modal-form">
              <div className="mm-price-item-info">
                <FontAwesomeIcon icon={getCategoryIcon(getItemField(selectedItemForPrice, 'itemCategory'))} />
                <div>
                  <strong>{getItemField(selectedItemForPrice, 'productName')}</strong>
                  <span>{getRestaurantName(getItemField(selectedItemForPrice, 'restaurantId'))}</span>
                </div>
              </div>

              <div className="mm-form-group">
                <label>Portion Size *</label>
                <select
                  value={priceForm.portionSize}
                  onChange={(e) => setPriceForm({ ...priceForm, portionSize: e.target.value })}
                  required
                >
                  {portionSizes.map(size => (
                    <option key={size} value={size}>{size.charAt(0).toUpperCase() + size.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="mm-form-group">
                <label>Price (₹) *</label>
                <div className="mm-price-input">
                  <span>₹</span>
                  <input
                    type="number"
                    value={priceForm.price}
                    onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="mm-modal-footer">
                <button type="button" className="mm-btn-secondary" onClick={() => { setShowPriceModal(false); resetPriceForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="mm-btn-primary">
                  {editingPrice ? <><FontAwesomeIcon icon={faSave} /> Update</> : <><FontAwesomeIcon icon={faPlus} /> Add</>}
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
