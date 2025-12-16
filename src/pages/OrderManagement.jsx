import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI, restaurantAPI, itemAPI } from '../services/api';
import './OrderManagement.css';

const OrderManagement = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedRestaurant, setSelectedRestaurant] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const ORDER_STATUSES = [
    { value: 'pending', label: 'Pending', color: '#f59e0b', bg: '#fef3c7' },
    { value: 'confirmed', label: 'Confirmed', color: '#3b82f6', bg: '#dbeafe' },
    { value: 'preparing', label: 'Preparing', color: '#8b5cf6', bg: '#ede9fe' },
    { value: 'ready', label: 'Ready', color: '#10b981', bg: '#d1fae5' },
    { value: 'served', label: 'Served', color: '#06b6d4', bg: '#cffafe' },
    { value: 'completed', label: 'Completed', color: '#22c55e', bg: '#dcfce7' },
    { value: 'cancelled', label: 'Cancelled', color: '#ef4444', bg: '#fee2e2' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, restaurantsRes, itemsRes] = await Promise.all([
        orderAPI.getAll(),
        restaurantAPI.getAll(),
        itemAPI.getAll()
      ]);
      
      const ordersData = ordersRes.data || [];
      ordersData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setOrders(ordersData);
      setRestaurants(restaurantsRes.data || []);
      setItems(itemsRes.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus, 'admin');
      setOrders(prev => prev.map(order => 
        order.orderId === orderId ? { ...order, orderStatus: newStatus } : order
      ));
    } catch (err) {
      alert('Failed to update order status');
      console.error(err);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      await orderAPI.delete(orderId);
      setOrders(prev => prev.filter(order => order.orderId !== orderId));
    } catch (err) {
      alert('Failed to delete order');
      console.error(err);
    }
  };

  const getRestaurantName = (restaurantId) => {
    const restaurant = restaurants.find(r => r.rest_id === restaurantId || r.restId === restaurantId);
    return restaurant?.name || 'Unknown';
  };

  const getItemName = (productId) => {
    const item = items.find(i => i.itemId === productId || i.productId === productId);
    return item?.productName || 'Unknown Item';
  };

  const getStatusInfo = (status) => {
    const effectiveStatus = status || 'pending';
    return ORDER_STATUSES.find(s => s.value === effectiveStatus) || ORDER_STATUSES[0];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const filteredOrders = orders.filter(order => {
    const matchesRestaurant = selectedRestaurant === 'all' || 
      order.restaurantId === selectedRestaurant;
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'pending' 
        ? (!order.orderStatus || order.orderStatus === 'pending') 
        : order.orderStatus === selectedStatus);
    const matchesSearch = searchTerm === '' || 
      order.createdBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone?.includes(searchTerm) ||
      order.tableNumber?.toString().includes(searchTerm);
    return matchesRestaurant && matchesStatus && matchesSearch;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => !o.orderStatus || o.orderStatus === 'pending').length,
    confirmed: orders.filter(o => o.orderStatus === 'confirmed').length,
    preparing: orders.filter(o => o.orderStatus === 'preparing').length,
    ready: orders.filter(o => o.orderStatus === 'ready').length,
    served: orders.filter(o => o.orderStatus === 'served').length,
    completed: orders.filter(o => o.orderStatus === 'completed').length,
    cancelled: orders.filter(o => o.orderStatus === 'cancelled').length
  };

  const handleBack = () => navigate('/admin');

  if (loading) {
    return (
      <div className="order-management">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="order-management">
      <div className="page-header">
        <div className="header-left">
          <button className="btn-back" onClick={handleBack}>
            <span className="back-icon">←</span>
            <span className="back-text">Back</span>
          </button>
          <div className="header-title">
            <h1>Order Management</h1>
            <p className="header-subtitle">Monitor and manage customer orders</p>
          </div>
        </div>
        <button className="btn-refresh" onClick={fetchData}>
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️</span> {error}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Orders</span>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
        <div className="stat-card confirmed">
          <div className="stat-icon">✓</div>
          <div className="stat-info">
            <span className="stat-value">{stats.confirmed}</span>
            <span className="stat-label">Confirmed</span>
          </div>
        </div>
        <div className="stat-card preparing">
          <div className="stat-icon">👨‍🍳</div>
          <div className="stat-info">
            <span className="stat-value">{stats.preparing}</span>
            <span className="stat-label">Preparing</span>
          </div>
        </div>
        <div className="stat-card ready">
          <div className="stat-icon">🍽️</div>
          <div className="stat-info">
            <span className="stat-value">{stats.ready}</span>
            <span className="stat-label">Ready</span>
          </div>
        </div>
        <div className="stat-card served">
          <div className="stat-icon">🚚</div>
          <div className="stat-info">
            <span className="stat-value">{stats.served}</span>
            <span className="stat-label">Served</span>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
        <div className="stat-card cancelled">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <span className="stat-value">{stats.cancelled}</span>
            <span className="stat-label">Cancelled</span>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>Restaurant</label>
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
        <div className="filter-group">
          <label>Status</label>
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            {ORDER_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="filter-group search">
          <label>Search</label>
          <input
            type="text"
            placeholder="Customer name, phone, table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="orders-container">
        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <span>📋</span>
            <p>No orders found</p>
          </div>
        ) : (
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order Info</th>
                  <th>Restaurant</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const statusInfo = getStatusInfo(order.orderStatus);
                  const hasNotes = order.orderNotes || order.itemNotes;
                  return (
                    <tr key={order.orderId}>
                      <td>
                        <div className="order-info">
                          <div className="order-customer">
                            <strong>{order.createdBy || 'Guest'}</strong>
                            {order.customerPhone && (
                              <span className="order-phone">{order.customerPhone}</span>
                            )}
                          </div>
                          <div className="order-meta">
                            <span className="table-badge">Table {order.tableNumber}</span>
                            <span className="order-time">{formatDate(order.createdAt)}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="restaurant-name">
                          {getRestaurantName(order.restaurantId)}
                        </span>
                      </td>
                      <td>
                        <div className="item-info">
                          <span className="item-name">{getItemName(order.productId)}</span>
                          {order.portionSize && (
                            <span className="portion-size">{order.portionSize}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="quantity">{order.quantity || 1}</span>
                      </td>
                      <td>
                        <span className="price">₹{order.price || 0}</span>
                      </td>
                      <td>
                        {hasNotes ? (
                          <div className="inline-notes">
                            {order.orderNotes && (
                              <div className="inline-note">
                                <span className="note-label">📝</span>
                                <span className="note-text">{order.orderNotes}</span>
                              </div>
                            )}
                            {order.itemNotes && (
                              <div className="inline-note">
                                <span className="note-label">🍴</span>
                                <span className="note-text">{order.itemNotes}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="no-notes">—</span>
                        )}
                      </td>
                      <td>
                        <select
                          className="status-select"
                          value={order.orderStatus || 'pending'}
                          onChange={(e) => handleStatusChange(order.orderId, e.target.value)}
                          style={{ 
                            backgroundColor: statusInfo.bg, 
                            color: statusInfo.color,
                            borderColor: statusInfo.color
                          }}
                        >
                          {ORDER_STATUSES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-action btn-delete"
                            onClick={() => handleDeleteOrder(order.orderId)}
                            title="Delete order"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderManagement;
