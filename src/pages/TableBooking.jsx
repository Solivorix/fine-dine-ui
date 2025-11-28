import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { itemAPI, priceAPI, orderAPI } from '../services/api';
import './TableBooking.css';

const TableBooking = () => {
  const { tableNumber } = useParams();
  const [mobileNumber, setMobileNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [prices, setPrices] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  useEffect(() => {
    if (showMenu) {
      fetchData();
    }
  }, [showMenu]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, pricesRes] = await Promise.all([
        itemAPI.getAll(),
        priceAPI.getAll(),
      ]);

      const availableItems = itemsRes.data.filter(
        (item) => item.itemStatus === 'available'
      );

      setMenuItems(availableItems);
      setPrices(pricesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
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
    const price = getItemPrice(item.itemId, portionSize);
    const cartItem = {
      ...item,
      portionSize,
      price,
      cartId: `${item.itemId}-${portionSize}`,
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
      
      const orderPromises = cart.map((item) =>
        orderAPI.create({
          productId: item.productId,
          tableNumber: parseInt(tableNumber),
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

  const categories = ['all', ...new Set(menuItems.map((item) => {
    const name = item.productName || '';
    return name.split(' ')[0];
  }))];

  const filteredItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter((item) => 
        item.productName?.toLowerCase().includes(selectedCategory.toLowerCase())
      );

  if (loading && !showMenu) {
    return (
      <div className="booking-loader">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="order-success">
        <div className="success-animation fade-in-scale">
          <div className="success-icon">✓</div>
          <h2>Order Placed Successfully!</h2>
          <p>Your order has been sent to the kitchen.</p>
          <p className="order-details">
            <strong>{customerName}</strong><br/>
            {mobileNumber}<br/>
            Table {tableNumber}
          </p>
        </div>
      </div>
    );
  }

  if (!showMenu) {
    return (
      <div className="mobile-input-container">
        <div className="mobile-input-card fade-in">
          <div className="welcome-header">
            <div className="restaurant-logo">🍽️</div>
            <h1>Welcome!</h1>
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

  return (
    <div className="table-booking-container">
      {/* Header */}
      <header className="booking-header fade-in">
        <div className="container">
          <div className="header-content">
            <div className="customer-info">
              <h1>Our Menu</h1>
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
                {cart.length > 0 && <span className="cart-count">{cart.length}</span>}
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
                {category}
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
              <p>No items available in this category</p>
            </div>
          ) : (
            <div className="menu-grid">
              {filteredItems.map((item, index) => {
                const priceOptions = getItemPriceOptions(item.itemId);
                const defaultPrice = priceOptions[0]?.price || 0;

                return (
                  <div
                    key={item.itemId}
                    className="menu-item-card card fade-in"
                    style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                  >
                    <div className="menu-item-image">
                      <div className="placeholder-image">
                        <span className="dish-emoji">🍽️</span>
                      </div>
                    </div>
                    
                    <div className="menu-item-content">
                      <h3 className="menu-item-name">{item.productName}</h3>
                      <p className="menu-item-description">{item.productDescription || 'Delicious dish prepared fresh'}</p>
                      
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
                            <>
                              <span className="menu-item-price">₹{defaultPrice}</span>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => addToCart(item, priceOptions[0]?.portion_size || 'regular')}
                              >
                                <span>Add</span>
                                <span>+</span>
                              </button>
                            </>
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
                {cart.map((item) => (
                  <div key={item.cartId} className="cart-item">
                    <div className="cart-item-info">
                      <h4>{item.productName}</h4>
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
                ))}
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
