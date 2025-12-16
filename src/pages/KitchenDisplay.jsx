import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI, restaurantAPI, itemAPI } from '../services/api';
import './KitchenDisplay.css';

const KitchenDisplay = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const STATUSES = [
    { value: 'pending', label: 'New Orders', color: '#f59e0b', icon: '🔔' },
    { value: 'confirmed', label: 'Confirmed', color: '#3b82f6', icon: '✓' },
    { value: 'preparing', label: 'Preparing', color: '#8b5cf6', icon: '👨‍🍳' },
    { value: 'ready', label: 'Ready', color: '#10b981', icon: '✅' },
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [ordersRes, restaurantsRes, itemsRes] = await Promise.all([
        orderAPI.getAll(),
        restaurantAPI.getAll(),
        itemAPI.getAll()
      ]);

      let ordersData = ordersRes.data || [];
      
      // Filter only active kitchen orders (not served, completed, or cancelled)
      ordersData = ordersData.filter(order => {
        const status = order.orderStatus || order.order_status || 'pending';
        return !['served', 'completed', 'cancelled'].includes(status);
      });

      // Sort by creation time (newest first)
      ordersData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setOrders(ordersData);
      setRestaurants(restaurantsRes.data || []);
      setItems(itemsRes.data || []);
      setLastUpdate(new Date());
    } catch (err) {
      setError('Failed to fetch orders');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const getRestaurantName = (restaurantId) => {
    const restaurant = restaurants.find(r => 
      (r.rest_id || r.restId) === restaurantId
    );
    return restaurant?.name || 'Unknown';
  };

  const getItemName = (productId) => {
    const item = items.find(i => 
      (i.itemId || i.productId) === productId
    );
    return item?.productName || item?.product_name || 'Unknown Item';
  };

  const getOrderStatus = (order) => {
    return order.orderStatus || order.order_status || 'pending';
  };

  const getElapsedTime = (createdAt) => {
    if (!createdAt) return '—';
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m ago`;
  };

  const getTimeColor = (createdAt) => {
    if (!createdAt) return 'var(--text-light)';
    const diffMins = Math.floor((new Date() - new Date(createdAt)) / 60000);
    
    if (diffMins < 10) return '#10b981'; // Green - fresh
    if (diffMins < 20) return '#f59e0b'; // Orange - getting old
    return '#ef4444'; // Red - urgent
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      
      // Optimistically update UI
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.orderId === orderId 
            ? { ...order, orderStatus: newStatus, order_status: newStatus }
            : order
        )
      );
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update order status');
      fetchData(); // Refetch to get correct state
    }
  };

  const handleMarkServed = async (orderId) => {
    try {
      await orderAPI.updateStatus(orderId, 'served');
      
      // Remove from display
      setOrders(prevOrders => 
        prevOrders.filter(order => order.orderId !== orderId)
      );
    } catch (err) {
      console.error('Error marking order as served:', err);
      alert('Failed to mark order as served');
    }
  };

  const filteredOrders = selectedRestaurant === 'all' 
    ? orders 
    : orders.filter(order => order.restaurantId === selectedRestaurant);

  const getOrdersByStatus = (status) => {
    return filteredOrders.filter(order => getOrderStatus(order) === status);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="kds-container">
        <div className="kds-loading">
          <div className="loading-spinner"></div>
          <p>Loading kitchen display...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kds-container">
      {/* Header */}
      <header className="kds-header">
        <div className="kds-header-left">
          <button className="btn-back" onClick={() => navigate('/admin')}>
            <span className="back-icon">←</span>
            <span className="back-text">Back</span>
          </button>
          <div className="kds-title">
            <h1>🍳 Kitchen Display System</h1>
            <p className="kds-subtitle">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="kds-header-actions">
          <div className="restaurant-filter-kds">
            <label>Restaurant:</label>
            <select 
              value={selectedRestaurant}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
            >
              <option value="all">All Restaurants</option>
              {restaurants.map(r => (
                <option key={r.rest_id || r.restId} value={r.rest_id || r.restId}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <button 
            className={`btn-auto-refresh ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          >
            <span>{autoRefresh ? '🔄' : '⏸️'}</span>
          </button>

          <button className="btn-refresh-kds" onClick={fetchData}>
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="kds-error">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Order Columns */}
      <div className="kds-board">
        {STATUSES.map(statusConfig => {
          const statusOrders = getOrdersByStatus(statusConfig.value);
          
          return (
            <div key={statusConfig.value} className="kds-column">
              <div 
                className="kds-column-header"
                style={{ backgroundColor: statusConfig.color }}
              >
                <div className="column-header-content">
                  <span className="column-icon">{statusConfig.icon}</span>
                  <h3>{statusConfig.label}</h3>
                  <span className="column-count">{statusOrders.length}</span>
                </div>
              </div>

              <div className="kds-column-body">
                {statusOrders.length === 0 ? (
                  <div className="kds-empty-column">
                    <span className="empty-icon">{statusConfig.icon}</span>
                    <p>No orders</p>
                  </div>
                ) : (
                  statusOrders.map(order => (
                    <div key={order.orderId} className="kds-order-card">
                      <div className="kds-order-header">
                        <div className="order-table">
                          <span className="table-icon">🪑</span>
                          <span className="table-number">Table {order.tableNumber}</span>
                        </div>
                        <div 
                          className="order-time"
                          style={{ color: getTimeColor(order.createdAt) }}
                        >
                          ⏱️ {getElapsedTime(order.createdAt)}
                        </div>
                      </div>

                      <div className="kds-order-body">
                        <div className="order-restaurant">
                          🏪 {getRestaurantName(order.restaurantId)}
                        </div>

                        <div className="order-item">
                          <div className="item-main">
                            <span className="item-name">
                              {getItemName(order.productId)}
                            </span>
                            <span className="item-qty">×{order.quantity || 1}</span>
                          </div>
                          {order.portionSize && (
                            <div className="item-portion">{order.portionSize}</div>
                          )}
                        </div>

                        {order.itemNotes && (
                          <div className="order-notes">
                            <span className="notes-icon">📝</span>
                            <span className="notes-text">{order.itemNotes}</span>
                          </div>
                        )}

                        {order.orderNotes && (
                          <div className="order-notes">
                            <span className="notes-icon">💬</span>
                            <span className="notes-text">{order.orderNotes}</span>
                          </div>
                        )}

                        <div className="order-customer">
                          <span>👤 {order.createdBy || 'Guest'}</span>
                          {order.customerPhone && (
                            <span>📱 {order.customerPhone}</span>
                          )}
                        </div>
                      </div>

                      <div className="kds-order-actions">
                        {statusConfig.value === 'pending' && (
                          <button 
                            className="btn-kds-action btn-confirm"
                            onClick={() => handleStatusChange(order.orderId, 'confirmed')}
                          >
                            ✓ Confirm
                          </button>
                        )}
                        
                        {statusConfig.value === 'confirmed' && (
                          <button 
                            className="btn-kds-action btn-start"
                            onClick={() => handleStatusChange(order.orderId, 'preparing')}
                          >
                            👨‍🍳 Start
                          </button>
                        )}
                        
                        {statusConfig.value === 'preparing' && (
                          <button 
                            className="btn-kds-action btn-ready"
                            onClick={() => handleStatusChange(order.orderId, 'ready')}
                          >
                            ✅ Ready
                          </button>
                        )}
                        
                        {statusConfig.value === 'ready' && (
                          <button 
                            className="btn-kds-action btn-served"
                            onClick={() => handleMarkServed(order.orderId)}
                          >
                            🍽️ Served
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KitchenDisplay;
