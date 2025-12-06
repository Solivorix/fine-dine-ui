import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { itemAPI, priceAPI, orderAPI, restaurantAPI } from '../services/api';
import './TableBooking.css';

const TableBooking = () => {
  const { restaurantId, tableNumber } = useParams();
  const navigate = useNavigate();
  
  // Restaurant selection state
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
  const [showCart, setShowCart] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

  useEffect(() => {
    if (!restaurantId) {
      fetchRestaurants();
    } else {
      fetchRestaurantDetails();
    }
  }, [restaurantId]);

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

      const availableItems = itemsRes.data.filter((item) => {
        const itemRestId = item.restaurant_id || item.restaurantId;
        const itemStatus = item.item_status || item.itemStatus;
        return itemRestId === activeRestaurantId && itemStatus === 'available';
      });

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

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
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
      setShowCart(false);
      
      setTimeout(() => {
        setCart([]);
        setOrderPlaced(false);
        setShowMenu(false);
        setMobileNumber('');
        setCustomerName('');
      }, 4000);
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
      'main': '🍛',
      'dessert': '🍰',
      'beverage': '🥤',
      'appetizer': '🍤',
      'soup': '🍲',
      'salad': '🥬',
      'pizza': '🍕',
      'burger': '🍔',
      'pasta': '🍝',
      'seafood': '🦐',
      'grill': '🥩',
      'breakfast': '🍳',
      'sandwich': '🥪',
      'other': '🍴'
    };
    return icons[category?.toLowerCase()] || '🍴';
  };

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
      <div className="tb-loading-screen">
        <div className="tb-loading-content">
          <div className="tb-loader"></div>
          <p>Discovering restaurants...</p>
        </div>
      </div>
    );
  }

  // Restaurant Selection Screen
  if (!restaurantId && !selectedRestaurant) {
    return (
      <div className="tb-selection-screen">
        <div className="tb-selection-container">
          <div className="tb-selection-header">
            <div className="tb-brand">
              <span className="tb-brand-icon">✨</span>
              <span className="tb-brand-text">FineDine</span>
            </div>
            <div className="tb-table-indicator">
              <span className="tb-table-icon">🪑</span>
              <span>Table {tableNumber}</span>
            </div>
          </div>

          <div className="tb-selection-content">
            <h1>Select Your Restaurant</h1>
            <p className="tb-selection-subtitle">Choose where you're dining today</p>

            {restaurants.length === 0 ? (
              <div className="tb-empty-restaurants">
                <div className="tb-empty-icon">🏪</div>
                <h3>No Restaurants Available</h3>
                <p>Please check back later</p>
              </div>
            ) : (
              <div className="tb-restaurant-grid">
                {restaurants.map((restaurant) => {
                  const id = restaurant.rest_id || restaurant.restId;
                  const imageUrl = restaurant.imageUrl;
                  return (
                    <div 
                      key={id} 
                      className="tb-restaurant-card"
                      onClick={() => handleSelectRestaurant(restaurant)}
                    >
                      <div className="tb-restaurant-image">
                        {imageUrl ? (
                          <img src={getImageUrl(imageUrl)} alt={restaurant.name} />
                        ) : (
                          <div className="tb-restaurant-placeholder">
                            <span>🍽️</span>
                          </div>
                        )}
                        <div className="tb-restaurant-overlay">
                          <span className="tb-select-btn">View Menu →</span>
                        </div>
                      </div>
                      <div className="tb-restaurant-info">
                        <h3>{restaurant.name}</h3>
                        {restaurant.address && (
                          <p><span>📍</span> {restaurant.address}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="tb-selection-footer">
            <p>Powered by <span>FineDine</span></p>
          </div>
        </div>
      </div>
    );
  }

  // Order Success Screen
  if (orderPlaced) {
    return (
      <div className="tb-success-screen">
        <div className="tb-success-content">
          <div className="tb-success-animation">
            <div className="tb-success-circle">
              <svg viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="25" fill="none" />
                <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
          </div>
          <h1>Order Placed!</h1>
          <p className="tb-success-message">Your order has been sent to the kitchen</p>
          
          <div className="tb-success-details">
            <div className="tb-success-detail-item">
              <span className="tb-detail-icon">👤</span>
              <span>{customerName}</span>
            </div>
            <div className="tb-success-detail-item">
              <span className="tb-detail-icon">📱</span>
              <span>{mobileNumber}</span>
            </div>
            <div className="tb-success-detail-item">
              <span className="tb-detail-icon">🏪</span>
              <span>{getRestaurantName()}</span>
            </div>
            <div className="tb-success-detail-item">
              <span className="tb-detail-icon">🪑</span>
              <span>Table {tableNumber}</span>
            </div>
          </div>

          <div className="tb-success-items">
            <h4>Order Summary</h4>
            {cart.map((item) => (
              <div key={item.cartId} className="tb-success-item">
                <span>{item.quantity}x {item.product_name || item.productName}</span>
                <span>₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="tb-success-total">
              <span>Total</span>
              <span>₹{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          <p className="tb-success-note">Thank you for dining with us!</p>
        </div>
      </div>
    );
  }

  // Customer Details Screen
  if (!showMenu) {
    return (
      <div className="tb-welcome-screen">
        <div className="tb-welcome-container">
          <div className="tb-welcome-decor tb-decor-1"></div>
          <div className="tb-welcome-decor tb-decor-2"></div>
          
          <div className="tb-welcome-card">
            <div className="tb-welcome-header">
              <div className="tb-restaurant-badge">
                <span className="tb-badge-icon">🍽️</span>
              </div>
              <h1>{getRestaurantName()}</h1>
              <div className="tb-table-badge">
                <span>Table {tableNumber}</span>
              </div>
            </div>

            <div className="tb-welcome-body">
              <h2>Welcome!</h2>
              <p className="tb-welcome-subtitle">Please enter your details to continue</p>

              <form onSubmit={handleStartOrder} className="tb-welcome-form">
                <div className="tb-form-group">
                  <label htmlFor="customerName">
                    <span className="tb-label-icon">👤</span>
                    Your Name
                  </label>
                  <input
                    id="customerName"
                    type="text"
                    placeholder="Enter your name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="tb-form-group">
                  <label htmlFor="mobileNumber">
                    <span className="tb-label-icon">📱</span>
                    Mobile Number
                  </label>
                  <input
                    id="mobileNumber"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                    pattern="[0-9]{10}"
                    maxLength="10"
                  />
                  <span className="tb-input-hint">We'll notify you when your order is ready</span>
                </div>

                <button
                  type="submit"
                  className="tb-btn-primary"
                  disabled={!mobileNumber || mobileNumber.length < 10 || !customerName.trim()}
                >
                  <span>View Menu</span>
                  <span className="tb-btn-arrow">→</span>
                </button>
              </form>
            </div>

            <div className="tb-welcome-features">
              <div className="tb-feature">
                <span className="tb-feature-icon">⚡</span>
                <span>Quick Order</span>
              </div>
              <div className="tb-feature">
                <span className="tb-feature-icon">🍳</span>
                <span>Fresh Food</span>
              </div>
              <div className="tb-feature">
                <span className="tb-feature-icon">💳</span>
                <span>Easy Pay</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Menu Screen
  return (
    <div className="tb-menu-screen">
      {/* Header */}
      <header className="tb-header">
        <div className="tb-header-content">
          <div className="tb-header-left">
            <h1 className="tb-header-title">{getRestaurantName()}</h1>
            <div className="tb-header-info">
              <span className="tb-header-badge">
                <span>👤</span> {customerName}
              </span>
              <span className="tb-header-badge">
                <span>🪑</span> Table {tableNumber}
              </span>
            </div>
          </div>
          <button 
            className="tb-cart-btn"
            onClick={() => setShowCart(true)}
          >
            <div className="tb-cart-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {getTotalItems() > 0 && (
                <span className="tb-cart-count">{getTotalItems()}</span>
              )}
            </div>
            <span className="tb-cart-total">₹{calculateTotal().toFixed(0)}</span>
          </button>
        </div>
      </header>

      {/* Categories */}
      <div className="tb-categories">
        <div className="tb-categories-scroll">
          {categories.map((category) => (
            <button
              key={category}
              className={`tb-category-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              <span className="tb-category-icon">
                {category === 'all' ? '🍴' : getCategoryIcon(category)}
              </span>
              <span className="tb-category-name">
                {category === 'all' ? 'All' : category}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <main className="tb-menu-main">
        {loading ? (
          <div className="tb-menu-loading">
            <div className="tb-loader"></div>
            <p>Loading delicious items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="tb-menu-empty">
            <div className="tb-empty-icon">🍽️</div>
            <h3>No items available</h3>
            <p>Check back soon for new dishes!</p>
          </div>
        ) : (
          <div className="tb-menu-grid">
            {filteredItems.map((item, index) => {
              const itemId = item.item_id || item.itemId;
              const productName = item.product_name || item.productName;
              const productDescription = item.product_description || item.productDescription;
              const imageUrl = item.image_url || item.imageUrl;
              const category = item.item_category || item.itemCategory;
              const priceOptions = getItemPriceOptions(itemId);
              const defaultPrice = priceOptions[0]?.price || 0;
              const cartItem = cart.find(ci => ci.cartId === `${itemId}-${priceOptions[0]?.portion_size || 'regular'}`);

              return (
                <div
                  key={itemId}
                  className="tb-menu-item"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="tb-item-image">
                    {imageUrl ? (
                      <img src={getImageUrl(imageUrl)} alt={productName} />
                    ) : (
                      <div className="tb-item-placeholder">
                        <span>{getCategoryIcon(category)}</span>
                      </div>
                    )}
                    <span className="tb-item-category">{category}</span>
                  </div>
                  
                  <div className="tb-item-content">
                    <h3 className="tb-item-name">{productName}</h3>
                    {productDescription && (
                      <p className="tb-item-description">{productDescription}</p>
                    )}
                    
                    <div className="tb-item-footer">
                      {priceOptions.length > 1 ? (
                        <div className="tb-price-options">
                          {priceOptions.map((priceOpt) => (
                            <button
                              key={priceOpt.price_id}
                              className="tb-price-option"
                              onClick={() => addToCart(item, priceOpt.portion_size)}
                            >
                              <span className="tb-portion">{priceOpt.portion_size}</span>
                              <span className="tb-price">₹{priceOpt.price}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="tb-single-price">
                          <span className="tb-item-price">₹{defaultPrice}</span>
                          {cartItem ? (
                            <div className="tb-qty-controls">
                              <button 
                                className="tb-qty-btn"
                                onClick={() => updateCartQuantity(cartItem.cartId, cartItem.quantity - 1)}
                              >
                                −
                              </button>
                              <span className="tb-qty">{cartItem.quantity}</span>
                              <button 
                                className="tb-qty-btn"
                                onClick={() => updateCartQuantity(cartItem.cartId, cartItem.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              className="tb-add-btn"
                              onClick={() => addToCart(item, priceOptions[0]?.portion_size || 'regular')}
                            >
                              <span>ADD</span>
                              <span className="tb-add-icon">+</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Cart Button (Mobile) */}
      {cart.length > 0 && !showCart && (
        <div className="tb-floating-cart" onClick={() => setShowCart(true)}>
          <div className="tb-floating-cart-info">
            <span className="tb-floating-items">{getTotalItems()} items</span>
            <span className="tb-floating-total">₹{calculateTotal().toFixed(2)}</span>
          </div>
          <span className="tb-floating-btn">View Cart →</span>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="tb-cart-overlay" onClick={() => setShowCart(false)}>
          <div className="tb-cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="tb-cart-header">
              <h2>Your Order</h2>
              <button className="tb-cart-close" onClick={() => setShowCart(false)}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="tb-cart-body">
              {cart.length === 0 ? (
                <div className="tb-cart-empty">
                  <span className="tb-cart-empty-icon">🛒</span>
                  <p>Your cart is empty</p>
                  <button className="tb-btn-secondary" onClick={() => setShowCart(false)}>
                    Browse Menu
                  </button>
                </div>
              ) : (
                <div className="tb-cart-items">
                  {cart.map((item) => {
                    const productName = item.product_name || item.productName;
                    return (
                      <div key={item.cartId} className="tb-cart-item">
                        <div className="tb-cart-item-info">
                          <h4>{productName}</h4>
                          <span className="tb-cart-item-portion">{item.portionSize}</span>
                          <span className="tb-cart-item-price">₹{item.price} each</span>
                        </div>
                        <div className="tb-cart-item-actions">
                          <div className="tb-cart-qty">
                            <button onClick={() => updateCartQuantity(item.cartId, item.quantity - 1)}>−</button>
                            <span>{item.quantity}</span>
                            <button onClick={() => updateCartQuantity(item.cartId, item.quantity + 1)}>+</button>
                          </div>
                          <span className="tb-cart-item-total">₹{(item.price * item.quantity).toFixed(2)}</span>
                          <button 
                            className="tb-cart-remove"
                            onClick={() => removeFromCart(item.cartId)}
                          >
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="tb-cart-footer">
                <div className="tb-cart-summary">
                  <div className="tb-summary-row">
                    <span>Subtotal</span>
                    <span>₹{calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="tb-summary-row tb-summary-total">
                    <span>Total</span>
                    <span>₹{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
                <button 
                  className="tb-btn-checkout"
                  onClick={placeOrder}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="tb-btn-loader"></span>
                      <span>Placing Order...</span>
                    </>
                  ) : (
                    <>
                      <span>Place Order</span>
                      <span className="tb-btn-price">₹{calculateTotal().toFixed(2)}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableBooking;
