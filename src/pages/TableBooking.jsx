import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { restaurantAPI, itemAPI, priceAPI, orderAPI } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUtensils, faChair, faUser, faMobile, faArrowRight, faCartShopping,
  faClipboardList, faStore, faClock, faSeedling, faCake, faWineGlass,
  faShrimp, faBowlFood, faPizzaSlice, faBurger, faBowlRice
} from '@fortawesome/free-solid-svg-icons';
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
    const icons = { 'starter': faSeedling, 'main': faUtensils, 'dessert': faCake, 'beverage': faWineGlass, 'appetizer': faShrimp, 'soup': faBowlFood, 'biryani': faBowlRice, 'pizza': faPizzaSlice, 'burger': faBurger };
    return icons[category?.toLowerCase()] || faUtensils;
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

  const getRestaurantLogo = () => {
    if (restaurant?.logoUrl) return getImageUrl(restaurant.logoUrl);
    return null;
  };

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
              <div className="hero-logo">
                {getRestaurantLogo() ? (
                  <img src={getRestaurantLogo()} alt={restaurant?.name} />
                ) : (
                  <FontAwesomeIcon icon={faUtensils} size="2x" />
                )}
              </div>
              <h1>{restaurant?.name}</h1>
              <p className="hero-subtitle">Delicious food, just a tap away</p>
              <div className="table-chip">
                <span className="table-icon"><FontAwesomeIcon icon={faChair} /></span>
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
                  <div className="input-icon"><FontAwesomeIcon icon={faUser} /></div>
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Your name" required />
                </div>
                <div className="input-field">
                  <div className="input-icon"><FontAwesomeIcon icon={faMobile} /></div>
                  <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone number" required />
                </div>
                <button type="submit" className="btn-hero">
                  <span>Explore Menu</span>
                  <span className="btn-icon"><FontAwesomeIcon icon={faArrowRight} /></span>
                </button>
              </form>
            </div>

            <div className="welcome-features">
              <div className="feature"><FontAwesomeIcon icon={faUtensils} /><span>Browse Menu</span></div>
              <div className="feature"><FontAwesomeIcon icon={faCartShopping} /><span>Add to Cart</span></div>
              <div className="feature"><FontAwesomeIcon icon={faClipboardList} /><span>Order Instantly</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success Screen
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
                {getRestaurantLogo() && <img src={getRestaurantLogo()} alt="" className="success-logo" />}
                <div>
                  <h3>{restaurant?.name}</h3>
                  <span>Table {tableNumber}</span>
                </div>
              </div>
              <div className="order-time">
                {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
            </div>

            <div className="customer-info">
              <div className="customer-detail"><span className="detail-icon"><FontAwesomeIcon icon={faUser} /></span><span>{customerName}</span></div>
              <div className="customer-detail"><span className="detail-icon"><FontAwesomeIcon icon={faMobile} /></span><span>{customerPhone}</span></div>
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
                            <button className="btn-cancel-item" onClick={() => handleCancelOrder(index)}>Remove</button>
                          </div>
                        ) : (
                          <span className="qty-display">×{order.quantity}</span>
                        )}
                        <span className="ordered-item-price">₹{order.price * order.quantity}</span>
                      </div>
                      {editable && timeLeft && <div className="modify-timer"><span className="timer-icon">⏱</span><span>{timeLeft} left to modify</span></div>}
                      {!editable && <div className="item-confirmed"><span>✓</span><span>Being prepared</span></div>}
                    </div>
                  );
                })}
                <div className="order-total"><span>Total Amount</span><span>₹{getMyOrdersTotal()}</span></div>
              </div>
            )}
          </div>

          <button className="btn-order-more" onClick={() => setCurrentScreen('menu')}>
            <FontAwesomeIcon icon={faUtensils} /><span>Order More Items</span>
          </button>
        </div>
      </div>
    );
  }

  // Menu Screen with Right Side Checkout
  return (
    <div className={`app ${showCheckout ? 'checkout-open' : ''}`}>
      {/* Enhanced Header */}
      <header className="menu-header">
        <div className="header-brand">
          <div className="brand-logo">
            {getRestaurantLogo() ? (
              <img src={getRestaurantLogo()} alt={restaurant?.name} />
            ) : (
              <span className="logo-placeholder"><FontAwesomeIcon icon={faUtensils} /></span>
            )}
          </div>
          <div className="brand-info">
            <h1>{restaurant?.name}</h1>
            <div className="brand-meta">
              <span className="meta-badge"><FontAwesomeIcon icon={faChair} /> Table {tableNumber}</span>
              <span className="meta-divider">•</span>
              <span className="meta-badge"><FontAwesomeIcon icon={faUser} /> {customerName}</span>
            </div>
          </div>
        </div>
        
        <div className="header-actions">
          {myOrders.length > 0 && (
            <button className="btn-header-action" onClick={() => setShowMyOrders(true)}>
              <FontAwesomeIcon icon={faClipboardList} />
              <span className="action-label">My Orders</span>
              <span className="action-badge">{myOrders.length}</span>
            </button>
          )}
          <button className={`btn-header-action btn-cart ${cart.length > 0 ? 'has-items' : ''}`} onClick={() => setShowCheckout(true)}>
            <FontAwesomeIcon icon={faCartShopping} />
            <span className="action-label">Cart</span>
            {cart.length > 0 && <span className="action-badge">{getCartItemCount()}</span>}
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="filter-section">
        <div className="food-type-filters">
          {foodTypes.map(ft => (
            <button key={ft.value} className={`filter-pill ${ft.class || ''} ${selectedFoodType === ft.value ? 'active' : ''}`} onClick={() => setSelectedFoodType(ft.value)}>
              {ft.label}
            </button>
          ))}
        </div>
        <div className="category-filters">
          {categories.map(cat => (
            <button key={cat} className={`category-pill ${selectedCategory === cat ? 'active' : ''}`} onClick={() => setSelectedCategory(cat)}>
              {cat === 'all' ? <><FontAwesomeIcon icon={faUtensils} /> All</> : <><FontAwesomeIcon icon={getCategoryIcon(cat)} /> {cat}</>}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="menu-layout">
        <main className="menu-main">
          {loading ? (
            <div className="loading-state"><div className="loading-spinner"></div><p>Loading delicious items...</p></div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state"><FontAwesomeIcon icon={faUtensils} size="2x" /><p>No items found</p></div>
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
                      {imageUrl ? <img src={getImageUrl(imageUrl)} alt={productName} /> : <div className="card-image-placeholder"><FontAwesomeIcon icon={getCategoryIcon(getItemField(item, 'itemCategory'))} /></div>}
                      <div className={`food-badge ${foodTypeInfo.class}`}></div>
                    </div>
                    <div className="card-content">
                      <h3 onClick={() => setShowItemDetail(item)}>{productName}</h3>
                      {productDescription && <p className="card-desc">{productDescription}</p>}
                      <div className="card-footer">
                        {minPrice ? <span className="card-price">₹{minPrice}{itemPrices.length > 1 ? '+' : ''}</span> : <span className="card-price-na">N/A</span>}
                        {itemPrices.length > 0 && (
                          cartItem ? (
                            <div className="qty-control">
                              <button onClick={() => updateCartQuantity(cart.indexOf(cartItem), -1)}>−</button>
                              <span>{cartItem.quantity}</span>
                              <button onClick={() => updateCartQuantity(cart.indexOf(cartItem), 1)}>+</button>
                            </div>
                          ) : (
                            <button className="btn-add" onClick={() => itemPrices.length === 1 ? addToCart(item, itemPrices[0]) : setShowItemDetail(item)}>
                              <span>ADD</span><span className="add-plus">+</span>
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

        {/* Right Side Checkout Panel */}
        <aside className={`checkout-sidebar ${showCheckout ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2><FontAwesomeIcon icon={faCartShopping} /> Your Cart</h2>
            <button className="btn-close-sidebar" onClick={() => setShowCheckout(false)}>×</button>
          </div>

          {cart.length === 0 ? (
            <div className="sidebar-empty">
              <FontAwesomeIcon icon={faCartShopping} size="2x" />
              <p>Your cart is empty</p>
              <span className="empty-hint">Add items from the menu</span>
            </div>
          ) : (
            <>
              <div className="sidebar-body">
                <div className="sidebar-info">
                  <div className="info-item">
                    <span className="info-icon"><FontAwesomeIcon icon={faStore} /></span>
                    <div><label>Restaurant</label><strong>{restaurant?.name}</strong></div>
                  </div>
                  <div className="info-row">
                    <div className="info-item small">
                      <span className="info-icon"><FontAwesomeIcon icon={faChair} /></span>
                      <div><label>Table</label><strong>{tableNumber}</strong></div>
                    </div>
                    <div className="info-item small">
                      <span className="info-icon"><FontAwesomeIcon icon={faUser} /></span>
                      <div><label>Name</label><strong>{customerName}</strong></div>
                    </div>
                  </div>
                </div>

                <div className="sidebar-items">
                  <h3>Items ({getCartItemCount()})</h3>
                  {cart.map((item, index) => (
                    <div key={index} className="sidebar-item">
                      <div className="sidebar-item-header">
                        <div className="sidebar-item-info">
                          <h4>{item.name}</h4>
                          {item.portion && <span className="item-portion">{item.portion}</span>}
                        </div>
                        <button className="btn-remove" onClick={() => removeFromCart(index)}>×</button>
                      </div>
                      <div className="sidebar-item-footer">
                        <div className="qty-control qty-sm">
                          <button onClick={() => updateCartQuantity(index, -1)}>−</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateCartQuantity(index, 1)}>+</button>
                        </div>
                        <span className="sidebar-item-price">₹{item.price * item.quantity}</span>
                      </div>
                      <input className="item-note-input" placeholder="Special instructions..." value={item.itemNotes || ''} onChange={(e) => updateCartItemNotes(index, e.target.value)} />
                    </div>
                  ))}
                </div>

                <div className="sidebar-notes">
                  <h3>Special Instructions</h3>
                  <textarea placeholder="Allergies, dietary requirements..." value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} rows={2} />
                </div>
              </div>

              <div className="sidebar-footer">
                <div className="sidebar-summary">
                  <div className="summary-row"><span>Subtotal</span><span>₹{getCartTotal()}</span></div>
                  <div className="summary-row total"><span>Total</span><span>₹{getCartTotal()}</span></div>
                </div>
                <button className="btn-place-order" onClick={handlePlaceOrder} disabled={loading}>
                  {loading ? <span>Placing Order...</span> : <><span>Place Order</span><span className="order-amount">₹{getCartTotal()}</span></>}
                </button>
              </div>
            </>
          )}
        </aside>

        {showCheckout && <div className="sidebar-overlay" onClick={() => setShowCheckout(false)}></div>}
      </div>

      {/* Mobile Cart Button */}
      {cart.length > 0 && !showCheckout && (
        <div className="mobile-cart-btn" onClick={() => setShowCheckout(true)}>
          <div className="mobile-cart-info">
            <span className="mobile-cart-count">{getCartItemCount()} items</span>
            <span className="mobile-cart-total">₹{getCartTotal()}</span>
          </div>
          <div className="mobile-cart-action"><span>View Cart</span><FontAwesomeIcon icon={faCartShopping} /></div>
        </div>
      )}

      {/* My Orders Modal */}
      {showMyOrders && (
        <div className="modal-overlay" onClick={() => setShowMyOrders(false)}>
          <div className="orders-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>My Orders</h2><button className="btn-close" onClick={() => setShowMyOrders(false)}>×</button></div>
            <div className="modal-body">
              {myOrders.length === 0 ? (
                <div className="empty-orders"><FontAwesomeIcon icon={faClipboardList} size="2x" /><p>No orders yet</p></div>
              ) : (
                <>
                  {myOrders.map((order, index) => {
                    const editable = isOrderEditable(order);
                    const timeLeft = getRemainingTime(order);
                    return (
                      <div key={index} className={`order-card ${!editable ? 'locked' : ''}`}>
                        <div className="order-card-main">
                          <div className="order-card-info"><h4>{order.name}</h4>{order.portion && <span>{order.portion}</span>}</div>
                          {editable ? (
                            <div className="qty-control qty-sm">
                              <button onClick={() => handleModifyOrder(index, order.quantity - 1)}>−</button>
                              <span>{order.quantity}</span>
                              <button onClick={() => handleModifyOrder(index, order.quantity + 1)}>+</button>
                            </div>
                          ) : <span className="qty-badge">×{order.quantity}</span>}
                          <span className="order-card-price">₹{order.price * order.quantity}</span>
                        </div>
                        {editable && timeLeft && <div className="order-timer"><FontAwesomeIcon icon={faClock} /> {timeLeft} to modify</div>}
                        {!editable && <div className="order-done">✓ Confirmed</div>}
                      </div>
                    );
                  })}
                  <div className="orders-total"><span>Total</span><span>₹{getMyOrdersTotal()}</span></div>
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
                  {imageUrl && <div className="item-modal-image"><img src={getImageUrl(imageUrl)} alt={productName} /></div>}
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
