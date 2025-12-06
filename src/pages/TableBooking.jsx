import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { itemAPI, priceAPI, orderAPI, restaurantAPI } from '../services/api';
import './TableBooking.css';

const TableBooking = () => {
  const { restaurantId, tableNumber } = useParams();
  const navigate = useNavigate();
  
  // Restaurant selection state (when no restaurantId in URL)
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  
  // Customer details state
  const [mobileNumber, setMobileNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  
  // Menu state
  const [menuItems, setMenuItems] = useState([]);
  const [prices, setPrices] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

  // Fetch restaurants if no restaurantId provided
  useEffect(() => {
    if (!restaurantId) {
      fetchRestaurants();
    } else {
      fetchRestaurantDetails();
    }
  }, [restaurantId]);

  // Fetch menu when restaurant is selected and customer enters details
  useEffect(() => {
    if (showMenu && (restaurantId || selectedRestaurant)) {
      fetchData();
    }
  }, [showMenu, restaurantId, selectedRestaurant]);

  const fetchRestaurants = async () => {
    try {
      setLoadingRestaurants(true);
      const response = await restaurantAPI.getAll();
      setRestaurants(response.data || []);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoadingRestaurants(false);
    }
  };

  const fetchRestaurantDetails = async () => {
    try {
      const response = await restaurantAPI.getById(restaurantId);
      setSelectedRestaurant(response.data);
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      // If restaurant not found, show restaurant selection
      fetchRestaurants();
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const activeRestaurantId = restaurantId || (selectedRestaurant?.rest_id || selectedRestaurant?.restId);
      
      const [itemsRes, pricesRes] = await Promise.all([
        itemAPI.getAll(),
        priceAPI.getAll(),
      ]);

      // Filter items by restaurant and availability
      const availableItems = itemsRes.data.filter((item) => {
        const itemRestId = item.restaurant_id || item.restaurantId;
        const itemStatus = item.item_status || item.itemStatus;
        return itemRestId === activeRestaurantId && itemStatus === 'available';
      });

      // Filter prices by restaurant
      const restaurantPrices = pricesRes.data.filter((price) => {
        return price.restaurant_id === activeRestaurantId;
      });

      setMenuItems(availableItems);
      setPrices(restaurantPrices);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRestaurant = (restaurant) => {
    const restId = restaurant.rest_id || restaurant.restId;
    // Navigate to the full URL with restaurantId
    navigate(`/restaurant/${restId}/table/${tableNumber}`);
    setSelectedRestaurant(restaurant);
  };

  const handleStartOrder = (e) => {
    e.preventDefault();
    if (mobileNumber.trim() && customerName.trim() && mobileNumber.length >= 10) {
      setShowMenu(true);
    }
  };

  const getItemPrice = (itemId, portionSize = 'regular') => {
    const price = prices.find(
      (p) => p.item_id === itemId && p.portion_size === portionSize
    );
    return price?.price || 0;
  };

  const getItemPriceOptions = (itemId) => {
    return prices.filter((p) => p.item_id === itemId);
  };

  const addToCart = (item, portionSize = 'regular') => {
    const itemId = item.item_id || item.itemId;
    const price = getItemPrice(itemId, portionSize);
    const cartItem = {
      ...item,
      portionSize,
      price,
      cartId: `${itemId}-${portionSize}`,
      quantity: 1,
    };

    setCart((prevCart) => {
      const existingItem = prevCart.find((ci) => ci.cartId === cartItem.cartId);
      if (existingItem) {
        return prevCart.map((ci) =>
          ci.cartId === cartItem.cartId
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        );
      }
      return [...prevCart, cartItem];
    });
  };

  const updateCartQuantity = (cartId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.cartId === cartId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (cartId) => {
    setCart((prevCart) => prevCart.filter((item) => item.cartId !== cartId));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const placeOrder = async () => {
    try {
      setLoading(true);
      const activeRestaurantId = restaurantId || (selectedRestaurant?.rest_id || selectedRestaurant?.restId);
      
      const orderPromises = cart.map((item) =>
        orderAPI.create({
          productId: item.product_id || item.productId,
          restaurantId: activeRestaurantId,
          tableNumber: parseInt(tableNumber),
          quantity: item.quantity,
          portionSize: item.portionSize,
          createdBy: `${customerName} (${mobileNumber})`,
        })
      );

      await Promise.all(orderPromises);
      setOrderPlaced(true);
      
      setTimeout(() => {
        setCart([]);
        setOrderPlaced(false);
        setShowMenu(false);
        setMobileNumber('');
        setCustomerName('');
      }, 3000);
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRestaurantName = () => {
    return selectedRestaurant?.name || 'Restaurant';
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${API_BASE_URL}${imageUrl}`;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'starter': '🥗',
      'main': '🍽️',
      'dessert': '🍰',
      'beverage': '🥤',
      'appetizer': '🍤',
      'soup': '🍲',
      'salad': '🥬'
    };
    return icons[category] || '🍴';
  };

  // Get unique categories from menu items
  const categories = ['all', ...new Set(menuItems.map((item) => {
    return item.item_category || item.itemCategory || 'other';
  }))];

  const filteredItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter((item) => {
        const category = item.item_category || item.itemCategory;
        return category === selectedCategory;
      });

  // Loading state
  if (loadingRestaurants) {
    return (
      <div className="booking-loader">
        <div className="spinner"></div>
        <p>Loading restaurants...</p>
      </div>
    );
  }

  // Restaurant Selection Screen (when no restaurantId in URL)
  if (!restaurantId && !selectedRestaurant) {
    return (
      <div className="restaurant-selection-container">
        <div className="restaurant-selection-card fade-in">
          <div className="selection-header">
            <div className="selection-logo">🍽️</div>
            <h1>Select Restaurant</h1>
            <p className="table-info">Table {tableNumber}</p>
          </div>

          {restaurants.length === 0 ? (
            <div className="no-restaurants">
              <span className="no-restaurants-icon">🏪</span>
              <p>No restaurants available at the moment.</p>
            </div>
          ) : (
            <div className="restaurant-selection-list">
              {restaurants.map((restaurant) => {
                const id = restaurant.rest_id || restaurant.restId;
                const imageUrl = restaurant.imageUrl;
                return (
                  <div 
                    key={id} 
                    className="restaurant-selection-item"
                    onClick={() => handleSelectRestaurant(restaurant)}
                  >
                    <div className="restaurant-selection-image">
                      {imageUrl ? (
                        <img src={getImageUrl(imageUrl)} alt={restaurant.name} />
                      ) : (
                        <div className="restaurant-placeholder">🏪</div>
                      )}
                    </div>
                    <div className="restaurant-selection-info">
                      <h3>{restaurant.name}</h3>
                      {restaurant.address && (
                        <p className="restaurant-address">📍 {restaurant.address}</p>
                      )}
                    </div>
                    <div className="restaurant-selection-arrow">→</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Order Success Screen
  if (orderPlaced) {
    return (
      <div className="order-success">
        <div className="success-animation fade-in-scale">
          <div className="success-icon">✓</div>
          <h2>Order Placed Successfully!</h2>
          <p>Your order has been sent to the kitchen.</p>
          <div className="order-details">
            <p><strong>{customerName}</strong></p>
            <p>{mobileNumber}</p>
            <p>{getRestaurantName()} - Table {tableNumber}</p>
          </div>
        </div>
      </div>
    );
  }

  // Customer Details Entry Screen
  if (!showMenu) {
    return (
      <div className="mobile-input-container">
        <div className="mobile-input-card fade-in">
          <div className="welcome-header">
            <div className="restaurant-logo">🍽️</div>
            <h1>{getRestaurantName()}</h1>
            <p className="table-info">Table {tableNumber}</p>
          </div>

          <form onSubmit={handleStartOrder} className="mobile-form">
            <div className="input-group">
              <label htmlFor="customerName" className="input-label">
                Your Name
              </label>
              <input
                id="customerName"
                type="text"
                className="input"
                placeholder="Enter your name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="input-group">
              <label htmlFor="mobileNumber" className="input-label">
                Mobile Number
              </label>
              <input
                id="mobileNumber"
                type="tel"
                className="input"
                placeholder="Enter 10 digit mobile number"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
                pattern="[0-9]{10}"
                maxLength="10"
              />
              <small className="input-hint">We'll use this to update you about your order</small>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 'var(--spacing-lg)' }}
              disabled={!mobileNumber || mobileNumber.length < 10 || !customerName.trim()}
            >
              View Menu & Order
            </button>
          </form>

          <div className="welcome-features">
            <div className="feature-item">
              <span className="feature-icon">📱</span>
              <span>Quick & Easy Ordering</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🍽️</span>
              <span>Fresh From Kitchen</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <span>Fast Service</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Menu Browsing Screen
  return (
    <div className="table-booking-container">
      {/* Header */}
      <header className="booking-header fade-in">
        <div className="container">
          <div className="header-content">
            <div className="customer-info">
              <h1>{getRestaurantName()}</h1>
              <p className="customer-details">
                <span className="customer-name">👤 {customerName}</span>
                <span className="table-badge">📍 Table {tableNumber}</span>
              </p>
            </div>
            <div className="cart-summary" onClick={() => document.getElementById('cart-section')?.scrollIntoView({ behavior: 'smooth' })}>
              <div className="cart-icon-wrapper">
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cart.length > 0 && <span className="cart-count">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>}
              </div>
              <div className="cart-total">₹{calculateTotal().toFixed(2)}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Category Filter */}
      <div className="category-filter fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="container">
          <div className="category-pills">
            {categories.map((category) => (
              <button
                key={category}
                className={`category-pill ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? '🍴 All' : `${getCategoryIcon(category)} ${category}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <main className="booking-main">
        <div className="container">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading menu...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🍽️</div>
              <h3>No items available</h3>
              <p>No items available in this category</p>
            </div>
          ) : (
            <div className="menu-grid">
              {filteredItems.map((item, index) => {
                const itemId = item.item_id || item.itemId;
                const productName = item.product_name || item.productName;
                const productDescription = item.product_description || item.productDescription;
                const imageUrl = item.image_url || item.imageUrl;
                const category = item.item_category || item.itemCategory;
                const priceOptions = getItemPriceOptions(itemId);
                const defaultPrice = priceOptions[0]?.price || 0;

                return (
                  <div
                    key={itemId}
                    className="menu-item-card card fade-in"
                    style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                  >
                    <div className="menu-item-image">
                      {imageUrl ? (
                        <img src={getImageUrl(imageUrl)} alt={productName} />
                      ) : (
                        <div className="placeholder-image">
                          <span className="dish-emoji">{getCategoryIcon(category)}</span>
                        </div>
                      )}
                      <span className="category-tag">{category}</span>
                    </div>
                    
                    <div className="menu-item-content">
                      <h3 className="menu-item-name">{productName}</h3>
                      <p className="menu-item-description">
                        {productDescription || 'Delicious dish prepared fresh'}
                      </p>
                      
                      <div className="menu-item-footer">
                        <div className="price-section">
                          {priceOptions.length > 1 ? (
                            <div className="price-options">
                              {priceOptions.map((priceOpt) => (
                                <button
                                  key={priceOpt.price_id}
                                  className="price-option-btn"
                                  onClick={() => addToCart(item, priceOpt.portion_size)}
                                >
                                  <span className="portion-label">{priceOpt.portion_size}</span>
                                  <span className="price">₹{priceOpt.price}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="single-price-row">
                              <span className="menu-item-price">₹{defaultPrice}</span>
                              <button
                                className="btn btn-primary btn-sm btn-add-item"
                                onClick={() => addToCart(item, priceOptions[0]?.portion_size || 'regular')}
                              >
                                <span>Add</span>
                                <span>+</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Cart Section */}
      {cart.length > 0 && (
        <div id="cart-section" className="cart-section slide-in-right">
          <div className="container">
            <div className="cart-panel card-elevated">
              <h2 className="cart-title">Your Order</h2>
              
              <div className="cart-items">
                {cart.map((item) => {
                  const productName = item.product_name || item.productName;
                  return (
                    <div key={item.cartId} className="cart-item">
                      <div className="cart-item-info">
                        <h4>{productName}</h4>
                        <p className="cart-item-portion">{item.portionSize}</p>
                        <p className="cart-item-price">₹{item.price}</p>
                      </div>
                      
                      <div className="cart-item-controls">
                        <button
                          className="quantity-btn"
                          onClick={() => updateCartQuantity(item.cartId, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="quantity">{item.quantity}</span>
                        <button
                          className="quantity-btn"
                          onClick={() => updateCartQuantity(item.cartId, item.quantity + 1)}
                        >
                          +
                        </button>
                        <button
                          className="remove-btn"
                          onClick={() => removeFromCart(item.cartId)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cart-summary-section">
                <div className="cart-total-row">
                  <span>Subtotal</span>
                  <span>₹{calculateTotal().toFixed(2)}</span>
                </div>
                <div className="cart-total-row total">
                  <span>Total</span>
                  <span>₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={placeOrder}
                disabled={loading}
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableBooking;
