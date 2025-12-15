import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { restaurantAPI, itemAPI, priceAPI, orderAPI } from '../services/api';
import './TableBooking.css';

const TableBooking = () => {
  const { restaurantId, tableNumber } = useParams();

  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [restaurant, setRestaurant] = useState(null);
  const [restaurantLoading, setRestaurantLoading] = useState(true);
  const [restaurantError, setRestaurantError] = useState(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const [menuItems, setMenuItems] = useState([]);
  const [prices, setPrices] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFoodType, setSelectedFoodType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [showItemDetail, setShowItemDetail] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);

  const [myOrders, setMyOrders] = useState([]);
  const [showMyOrders, setShowMyOrders] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
  const ORDER_EDIT_WINDOW_MS = 2 * 60 * 1000;

  const getItemField = (item, field) => item?.[field];
  const getPriceField = (price, field) => {
    if (!price) return undefined;
    const snakeCase = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    return price[field] !== undefined ? price[field] : price[snakeCase];
  };

  useEffect(() => {
    if (restaurantId) fetchRestaurant();
    else {
      setRestaurantError('Invalid URL. Please scan the QR code again.');
      setRestaurantLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    const interval = setInterval(() => setMyOrders(prev => [...prev]), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchRestaurant = async () => {
    try {
      setRestaurantLoading(true);
      const response = await restaurantAPI.getById(restaurantId);
      if (response.data) {
        setRestaurant(response.data);
        setRestaurantError(null);
      } else setRestaurantError('Restaurant not found.');
    } catch (error) {
      setRestaurantError('Unable to load restaurant.');
    } finally {
      setRestaurantLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const [itemsRes, pricesRes] = await Promise.all([itemAPI.getAll(), priceAPI.getAll()]);
      const allItems = itemsRes.data || [];
      const filteredItems = allItems.filter(item => {
        const itemRestId = getItemField(item, 'restaurantId');
        const status = getItemField(item, 'itemStatus');
        return itemRestId === restaurantId && status === 'available';
      });
      setMenuItems(filteredItems);
      setPrices(pricesRes.data || []);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartOrder = (e) => {
    e.preventDefault();
    if (customerName && customerPhone) {
      fetchMenuItems();
      setCurrentScreen('menu');
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    if (imageUrl.startsWith('/')) return `${API_BASE_URL}${imageUrl}`;
    return `${API_BASE_URL}/${imageUrl}`;
  };

  const getCategoryIcon = (category) => {
    const icons = { 'starter': '🥗', 'main': '🍛', 'dessert': '🍰', 'beverage': '🥤', 'appetizer': '🍤', 'soup': '🍲', 'biryani': '🍚', 'pizza': '🍕', 'burger': '🍔' };
    return icons[category?.toLowerCase()] || '🍴';
  };

  const getFoodTypeInfo = (foodType) => {
    const types = {
      'veg': { label: 'Veg', class: 'ft-veg' },
      'non-veg': { label: 'Non-Veg', class: 'ft-nonveg' },
      'egg': { label: 'Egg', class: 'ft-egg' }
    };
    return types[foodType?.toLowerCase()] || { label: foodType, class: '' };
  };

  const categories = ['all', ...new Set(menuItems.map(item => getItemField(item, 'itemCategory')).filter(Boolean))];
  const foodTypes = [
    { value: 'all', label: 'All' },
    { value: 'veg', label: 'Vegetarian', class: 'ft-veg' },
    { value: 'non-veg', label: 'Non-Veg', class: 'ft-nonveg' },
    { value: 'egg', label: 'Contains Egg', class: 'ft-egg' }
  ];

  const filteredItems = menuItems.filter(item => {
    const category = getItemField(item, 'itemCategory');
    const foodType = getItemField(item, 'foodType');
    return (selectedCategory === 'all' || category === selectedCategory) &&
           (selectedFoodType === 'all' || foodType === selectedFoodType);
  });

  const getItemPrices = (itemId) => prices.filter(p => getPriceField(p, 'itemId') === itemId);

  const addToCart = (item, price) => {
    const itemId = getItemField(item, 'itemId');
    const priceId = getPriceField(price, 'priceId');
    const existingIndex = cart.findIndex(c => c.itemId === itemId && c.priceId === priceId);
    
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, {
        itemId, priceId,
        name: getItemField(item, 'productName'),
        description: getItemField(item, 'productDescription'),
        portion: getPriceField(price, 'portionSize'),
        price: price.price,
        quantity: 1,
        itemNotes: ''
      }]);
    }
  };

  const updateCartQuantity = (index, delta) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) newCart.splice(index, 1);
    setCart(newCart);
  };

  const updateCartItemNotes = (index, notes) => {
    const newCart = [...cart];
    newCart[index].itemNotes = notes;
    setCart(newCart);
  };

  const removeFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const getCartTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const getCartItemCount = () => cart.reduce((sum, item) => sum + item.quantity, 0);

  const isOrderEditable = (order) => (Date.now() - order.placedAt) < ORDER_EDIT_WINDOW_MS;
  const getRemainingTime = (order) => {
    const remaining = ORDER_EDIT_WINDOW_MS - (Date.now() - order.placedAt);
    if (remaining <= 0) return null;
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    try {
      setLoading(true);
      const orderPromises = cart.map(cartItem => orderAPI.create({
        restaurantId, productId: cartItem.itemId,
        tableNumber: parseInt(tableNumber, 10),
        createdBy: customerName, updatedBy: customerName,
        customerPhone, orderNotes: orderNotes || '',
        itemNotes: cartItem.itemNotes || '',
        price: cartItem.price, quantity: cartItem.quantity,
        portionSize: cartItem.portion || ''
      }));
      const results = await Promise.all(orderPromises);
      const newOrders = cart.map((cartItem, index) => ({
        ...cartItem, orderId: results[index]?.data?.orderId,
        placedAt: Date.now(), orderNotes, status: 'pending'
      }));
      setMyOrders(prev => [...prev, ...newOrders]);
      setCart([]);
      setOrderNotes('');
      setShowCheckout(false);
      setCurrentScreen('success');
    } catch (error) {
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModifyOrder = async (orderIndex, newQuantity) => {
    const order = myOrders[orderIndex];
    if (!isOrderEditable(order)) return alert('Order can no longer be modified.');
    try {
      if (newQuantity <= 0) {
        if (order.orderId) await orderAPI.delete(order.orderId);
        setMyOrders(prev => prev.filter((_, i) => i !== orderIndex));
      } else {
        if (order.orderId) await orderAPI.update(order.orderId, { quantity: newQuantity });
        setMyOrders(prev => prev.map((o, i) => i === orderIndex ? { ...o, quantity: newQuantity } : o));
      }
    } catch (error) {
      alert('Failed to modify order.');
    }
  };

  const handleCancelOrder = async (orderIndex) => {
    const order = myOrders[orderIndex];
    if (!isOrderEditable(order)) return alert('Order can no longer be cancelled.');
    if (!window.confirm('Cancel this item?')) return;
    try {
      if (order.orderId) await orderAPI.delete(order.orderId);
      setMyOrders(prev => prev.filter((_, i) => i !== orderIndex));
    } catch (error) {
      alert('Failed to cancel order.');
    }
  };

  const getMyOrdersTotal = () => myOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0);

  // Loading
  if (restaurantLoading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Error
  if (restaurantError) {
    return (
      <div className="app">
        <div className="error-screen">
          <div className="error-emoji">😕</div>
          <h2>Oops!</h2>
          <p>{restaurantError}</p>
        </div>
      </div>
    );
  }

  // Welcome Screen
  if (currentScreen === 'welcome') {
    return (
      <div className="app welcome-app">
        <div className="welcome-screen">
          <div className="welcome-bg-pattern"></div>
          
          <div className="welcome-content">
            <div className="welcome-hero">
              <div className="hero-icon">
                <span>🍽️</span>
              </div>
              <h1>{restaurant?.name}</h1>
              <p className="hero-subtitle">Delicious food, just a tap away</p>
              <div className="table-chip">
                <span className="table-icon">🪑</span>
                <span>Table {tableNumber}</span>
              </div>
            </div>

            <div className="welcome-card">
              <div className="card-header">
                <h2>Get Started</h2>
                <p>Enter your details to explore our menu</p>
              </div>

              <form onSubmit={handleStartOrder}>
                <div className="input-field">
                  <div className="input-icon">👤</div>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>

                <div className="input-field">
                  <div className="input-icon">📱</div>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone number"
                    required
                  />
                </div>

                <button type="submit" className="btn-hero">
                  <span>Explore Menu</span>
                  <span className="btn-icon">→</span>
                </button>
              </form>
            </div>

            <div className="welcome-features">
              <div className="feature">
                <span>📖</span>
                <span>Browse Menu</span>
              </div>
              <div className="feature">
                <span>🛒</span>
                <span>Add to Cart</span>
              </div>
              <div className="feature">
                <span>✨</span>
                <span>Order Instantly</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success Screen - Beautiful Order Summary
  if (currentScreen === 'success') {
    return (
      <div className="app">
        <div className="success-screen">
          <div className="success-header">
            <div className="success-animation">
              <div className="success-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="success-rings"></div>
            </div>
            <h1>Order Confirmed!</h1>
            <p>Your delicious food is being prepared</p>
          </div>

          <div className="success-card">
            <div className="success-card-header">
              <div className="restaurant-info">
                <h3>{restaurant?.name}</h3>
                <span>Table {tableNumber}</span>
              </div>
              <div className="order-time">
                {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
            </div>

            <div className="customer-info">
              <div className="customer-detail">
                <span className="detail-icon">👤</span>
                <span>{customerName}</span>
              </div>
              <div className="customer-detail">
                <span className="detail-icon">📱</span>
                <span>{customerPhone}</span>
              </div>
            </div>

            {myOrders.length > 0 && (
              <div className="ordered-items">
                <h4>Order Summary</h4>
                {myOrders.map((order, index) => {
                  const editable = isOrderEditable(order);
                  const timeLeft = getRemainingTime(order);
                  return (
                    <div key={index} className={`ordered-item ${!editable ? 'locked' : ''}`}>
                      <div className="ordered-item-main">
                        <div className="ordered-item-info">
                          <h5>{order.name}</h5>
                          {order.portion && <span className="portion">{order.portion}</span>}
                        </div>
                        {editable ? (
                          <div className="order-modify">
                            <div className="qty-buttons">
                              <button onClick={() => handleModifyOrder(index, order.quantity - 1)}>−</button>
                              <span>{order.quantity}</span>
                              <button onClick={() => handleModifyOrder(index, order.quantity + 1)}>+</button>
                            </div>
                            <button className="btn-cancel-item" onClick={() => handleCancelOrder(index)}>
                              Remove
                            </button>
                          </div>
                        ) : (
                          <span className="qty-display">×{order.quantity}</span>
                        )}
                        <span className="ordered-item-price">₹{order.price * order.quantity}</span>
                      </div>
                      {editable && timeLeft && (
                        <div className="modify-timer">
                          <span className="timer-icon">⏱</span>
                          <span>{timeLeft} left to modify</span>
                        </div>
                      )}
                      {!editable && (
                        <div className="item-confirmed">
                          <span>✓</span>
                          <span>Being prepared</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                <div className="order-total">
                  <span>Total Amount</span>
                  <span>₹{getMyOrdersTotal()}</span>
                </div>
              </div>
            )}
          </div>

          <button className="btn-order-more" onClick={() => setCurrentScreen('menu')}>
            <span>🍴</span>
            <span>Order More Items</span>
          </button>
        </div>
      </div>
    );
  }

  // Menu Screen
  return (
    <div className="app">
      <header className="menu-header">
        <div className="header-main">
          <div className="header-left">
            <h1>{restaurant?.name}</h1>
            <div className="header-meta">
              <span className="meta-item">🪑 Table {tableNumber}</span>
              <span className="meta-item">👤 {customerName}</span>
            </div>
          </div>
          <div className="header-right">
            {myOrders.length > 0 && (
              <button className="btn-orders" onClick={() => setShowMyOrders(true)}>
                <span>📋</span>
                <span className="orders-badge">{myOrders.length}</span>
              </button>
            )}
          </div>
        </div>

        <div className="filter-section">
          <div className="food-type-filters">
            {foodTypes.map(ft => (
              <button
                key={ft.value}
                className={`filter-pill ${ft.class || ''} ${selectedFoodType === ft.value ? 'active' : ''}`}
                onClick={() => setSelectedFoodType(ft.value)}
              >
                {ft.label}
              </button>
            ))}
          </div>
          <div className="category-filters">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? '🍴 All' : `${getCategoryIcon(cat)} ${cat}`}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="menu-main">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading delicious items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <span>🍽️</span>
            <p>No items found</p>
          </div>
        ) : (
          <div className="menu-grid">
            {filteredItems.map((item) => {
              const itemId = getItemField(item, 'itemId');
              const productName = getItemField(item, 'productName');
              const productDescription = getItemField(item, 'productDescription');
              const imageUrl = getItemField(item, 'imageUrl');
              const foodType = getItemField(item, 'foodType');
              const foodTypeInfo = getFoodTypeInfo(foodType);
              const itemPrices = getItemPrices(itemId);
              const cartItem = cart.find(c => c.itemId === itemId);
              const minPrice = itemPrices.length > 0 ? Math.min(...itemPrices.map(p => p.price)) : null;

              return (
                <div key={itemId} className="menu-card">
                  <div className="card-image" onClick={() => setShowItemDetail(item)}>
                    {imageUrl ? (
                      <img src={getImageUrl(imageUrl)} alt={productName} />
                    ) : (
                      <div className="card-image-placeholder">
                        {getCategoryIcon(getItemField(item, 'itemCategory'))}
                      </div>
                    )}
                    <div className={`food-badge ${foodTypeInfo.class}`}></div>
                  </div>
                  
                  <div className="card-content">
                    <h3 onClick={() => setShowItemDetail(item)}>{productName}</h3>
                    {productDescription && <p className="card-desc">{productDescription}</p>}
                    
                    <div className="card-footer">
                      {minPrice ? (
                        <span className="card-price">₹{minPrice}{itemPrices.length > 1 ? '+' : ''}</span>
                      ) : (
                        <span className="card-price-na">N/A</span>
                      )}
                      
                      {itemPrices.length > 0 && (
                        cartItem ? (
                          <div className="qty-control">
                            <button onClick={() => updateCartQuantity(cart.indexOf(cartItem), -1)}>−</button>
                            <span>{cartItem.quantity}</span>
                            <button onClick={() => updateCartQuantity(cart.indexOf(cartItem), 1)}>+</button>
                          </div>
                        ) : itemPrices.length === 1 ? (
                          <button className="btn-add" onClick={() => addToCart(item, itemPrices[0])}>
                            <span>ADD</span>
                            <span className="add-plus">+</span>
                          </button>
                        ) : (
                          <button className="btn-add" onClick={() => setShowItemDetail(item)}>
                            <span>ADD</span>
                            <span className="add-plus">+</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="cart-float" onClick={() => setShowCheckout(true)}>
          <div className="cart-float-left">
            <span className="cart-count">{getCartItemCount()} {getCartItemCount() === 1 ? 'item' : 'items'}</span>
            <span className="cart-total">₹{getCartTotal()}</span>
          </div>
          <div className="cart-float-right">
            <span>View Cart</span>
            <span className="cart-arrow">🛒</span>
          </div>
        </div>
      )}

      {/* Checkout Popup Modal */}
      {showCheckout && (
        <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="checkout-modal" onClick={e => e.stopPropagation()}>
            <div className="checkout-header">
              <h2>Your Cart</h2>
              <button className="btn-close" onClick={() => setShowCheckout(false)}>×</button>
            </div>

            <div className="checkout-body">
              <div className="checkout-info">
                <div className="checkout-info-item">
                  <span>🏪</span>
                  <div>
                    <label>Restaurant</label>
                    <strong>{restaurant?.name}</strong>
                  </div>
                </div>
                <div className="checkout-info-item">
                  <span>🪑</span>
                  <div>
                    <label>Table</label>
                    <strong>{tableNumber}</strong>
                  </div>
                </div>
                <div className="checkout-info-item">
                  <span>👤</span>
                  <div>
                    <label>Name</label>
                    <strong>{customerName}</strong>
                  </div>
                </div>
                <div className="checkout-info-item">
                  <span>📱</span>
                  <div>
                    <label>Phone</label>
                    <strong>{customerPhone}</strong>
                  </div>
                </div>
              </div>

              <div className="checkout-items">
                <h3>Items ({getCartItemCount()})</h3>
                {cart.map((item, index) => (
                  <div key={index} className="checkout-item">
                    <div className="checkout-item-top">
                      <div className="checkout-item-details">
                        <h4>{item.name}</h4>
                        {item.portion && <span className="item-portion">{item.portion}</span>}
                      </div>
                      <button className="btn-remove-item" onClick={() => removeFromCart(index)}>×</button>
                    </div>
                    <div className="checkout-item-bottom">
                      <div className="qty-control">
                        <button onClick={() => updateCartQuantity(index, -1)}>−</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(index, 1)}>+</button>
                      </div>
                      <span className="checkout-item-price">₹{item.price * item.quantity}</span>
                    </div>
                    <input
                      className="item-notes-input"
                      placeholder="Add cooking instructions..."
                      value={item.itemNotes || ''}
                      onChange={(e) => updateCartItemNotes(index, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="checkout-notes">
                <h3>Special Instructions</h3>
                <textarea
                  placeholder="Any allergies or special requests for the restaurant..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="checkout-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>₹{getCartTotal()}</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>₹{getCartTotal()}</span>
                </div>
              </div>
            </div>

            <div className="checkout-footer">
              <button className="btn-place-order" onClick={handlePlaceOrder} disabled={loading || cart.length === 0}>
                {loading ? (
                  <span>Placing Order...</span>
                ) : (
                  <>
                    <span>Place Order</span>
                    <span className="order-total">₹{getCartTotal()}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Orders Modal */}
      {showMyOrders && (
        <div className="modal-overlay" onClick={() => setShowMyOrders(false)}>
          <div className="orders-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>My Orders</h2>
              <button className="btn-close" onClick={() => setShowMyOrders(false)}>×</button>
            </div>
            <div className="modal-body">
              {myOrders.length === 0 ? (
                <div className="empty-orders">
                  <span>📋</span>
                  <p>No orders yet</p>
                </div>
              ) : (
                <>
                  {myOrders.map((order, index) => {
                    const editable = isOrderEditable(order);
                    const timeLeft = getRemainingTime(order);
                    return (
                      <div key={index} className={`order-card ${!editable ? 'locked' : ''}`}>
                        <div className="order-card-main">
                          <div className="order-card-info">
                            <h4>{order.name}</h4>
                            {order.portion && <span>{order.portion}</span>}
                          </div>
                          {editable ? (
                            <div className="qty-control qty-sm">
                              <button onClick={() => handleModifyOrder(index, order.quantity - 1)}>−</button>
                              <span>{order.quantity}</span>
                              <button onClick={() => handleModifyOrder(index, order.quantity + 1)}>+</button>
                            </div>
                          ) : (
                            <span className="qty-badge">×{order.quantity}</span>
                          )}
                          <span className="order-card-price">₹{order.price * order.quantity}</span>
                        </div>
                        {editable && timeLeft && <div className="order-timer">⏱ {timeLeft} to modify</div>}
                        {!editable && <div className="order-done">✓ Confirmed</div>}
                      </div>
                    );
                  })}
                  <div className="orders-total">
                    <span>Total</span>
                    <span>₹{getMyOrdersTotal()}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {showItemDetail && (
        <div className="modal-overlay" onClick={() => setShowItemDetail(null)}>
          <div className="item-modal" onClick={e => e.stopPropagation()}>
            <button className="btn-close-float" onClick={() => setShowItemDetail(null)}>×</button>
            {(() => {
              const item = showItemDetail;
              const itemId = getItemField(item, 'itemId');
              const productName = getItemField(item, 'productName');
              const productDescription = getItemField(item, 'productDescription');
              const imageUrl = getItemField(item, 'imageUrl');
              const foodType = getItemField(item, 'foodType');
              const foodTypeInfo = getFoodTypeInfo(foodType);
              const itemPrices = getItemPrices(itemId);

              return (
                <>
                  {imageUrl && (
                    <div className="item-modal-image">
                      <img src={getImageUrl(imageUrl)} alt={productName} />
                    </div>
                  )}
                  <div className="item-modal-content">
                    <div className="item-modal-header">
                      <div className={`food-badge-lg ${foodTypeInfo.class}`}></div>
                      <h2>{productName}</h2>
                    </div>
                    {productDescription && <p className="item-modal-desc">{productDescription}</p>}
                    
                    <div className="item-options">
                      <h4>Select Option</h4>
                      {itemPrices.map(price => {
                        const priceId = getPriceField(price, 'priceId');
                        const portionSize = getPriceField(price, 'portionSize');
                        const cartItem = cart.find(c => c.itemId === itemId && c.priceId === priceId);
                        return (
                          <div key={priceId} className="item-option">
                            <div className="option-info">
                              <span className="option-name">{portionSize || 'Regular'}</span>
                              <span className="option-price">₹{price.price}</span>
                            </div>
                            {cartItem ? (
                              <div className="qty-control">
                                <button onClick={() => updateCartQuantity(cart.indexOf(cartItem), -1)}>−</button>
                                <span>{cartItem.quantity}</span>
                                <button onClick={() => updateCartQuantity(cart.indexOf(cartItem), 1)}>+</button>
                              </div>
                            ) : (
                              <button className="btn-add-option" onClick={() => addToCart(item, price)}>ADD</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableBooking;
