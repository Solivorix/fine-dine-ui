import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI, restaurantAPI } from '../services/api';
import './OrderManagement.css';

const OrderManagement = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, restaurantsRes] = await Promise.all([
        orderAPI.getAll(),
        restaurantAPI.getAll()
      ]);
      setOrders(ordersRes.data || []);
      setRestaurants(restaurantsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await orderAPI.getAll();
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      setOrders(orders.map(order => 
        (order.order_id || order.orderId) === orderId 
          ? { ...order, order_status: newStatus, orderStatus: newStatus }
          : order
      ));
      if (selectedOrder && (selectedOrder.order_id || selectedOrder.orderId) === orderId) {
        setSelectedOrder({ ...selectedOrder, order_status: newStatus, orderStatus: newStatus });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const getRestaurantName = (restaurantId) => {
    const restaurant = restaurants.find(r => 
      (r.rest_id || r.restId) === restaurantId
    );
    return restaurant?.name || 'Unknown';
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      'pending': { label: 'Pending', icon: '⏳', class: 'status-pending' },
      'confirmed': { label: 'Confirmed', icon: '✓', class: 'status-confirmed' },
      'preparing': { label: 'Preparing', icon: '👨‍🍳', class: 'status-preparing' },
      'ready': { label: 'Ready', icon: '🍽️', class: 'status-ready' },
      'served': { label: 'Served', icon: '✅', class: 'status-served' },
      'completed': { label: 'Completed', icon: '✅', class: 'status-completed' },
      'cancelled': { label: 'Cancelled', icon: '✕', class: 'status-cancelled' }
    };
    return statusMap[status?.toLowerCase()] || { label: status, icon: '•', class: 'status-default' };
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTimeSince = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const orderTime = new Date(dateString);
    const diffMs = now - orderTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const filteredOrders = orders.filter(order => {
    const restaurantId = order.restaurant_id || order.restaurantId;
    const status = order.order_status || order.orderStatus;
    const createdBy = order.created_by || order.createdBy || '';
    const productName = order.product_name || order.productName || '';
    const tableNumber = order.table_number || order.tableNumber;

    const matchesRestaurant = selectedRestaurant === 'all' || restaurantId === selectedRestaurant;
    const matchesStatus = selectedStatus === 'all' || status?.toLowerCase() === selectedStatus;
    const matchesSearch = searchTerm === '' || 
      createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tableNumber?.toString().includes(searchTerm);

    return matchesRestaurant && matchesStatus && matchesSearch;
  });

  // Group orders by table
  const groupedOrders = filteredOrders.reduce((acc, order) => {
    const tableNumber = order.table_number || order.tableNumber;
    const restaurantId = order.restaurant_id || order.restaurantId;
    const key = `${restaurantId}-${tableNumber}`;
    
    if (!acc[key]) {
      acc[key] = {
        tableNumber,
        restaurantId,
        restaurantName: getRestaurantName(restaurantId),
        orders: [],
        totalAmount: 0,
        latestTime: null
      };
    }
    
    const price = order.price || 0;
    const quantity = order.quantity || 1;
    acc[key].orders.push(order);
    acc[key].totalAmount += price * quantity;
    
    const orderTime = new Date(order.created_at || order.createdAt);
    if (!acc[key].latestTime || orderTime > acc[key].latestTime) {
      acc[key].latestTime = orderTime;
    }
    
    return acc;
  }, {});

  const sortedTableGroups = Object.values(groupedOrders).sort((a, b) => {
    return b.latestTime - a.latestTime;
  });

  // Statistics
  const stats = {
    total: orders.length,
    pending: orders.filter(o => (o.order_status || o.orderStatus)?.toLowerCase() === 'pending').length,
    preparing: orders.filter(o => (o.order_status || o.orderStatus)?.toLowerCase() === 'preparing').length,
    ready: orders.filter(o => (o.order_status || o.orderStatus)?.toLowerCase() === 'ready').length,
    completed: orders.filter(o => ['served', 'completed'].includes((o.order_status || o.orderStatus)?.toLowerCase())).length
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  if (loading) {
    return (
      <div className="om-loading">
        <div className="om-loader"></div>
        <p>Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="om-container">
      {/* Header */}
      <header className="om-header">
        <div className="om-header-content">
          <div className="om-header-left">
            <button className="om-back-btn" onClick={() => navigate('/admin')}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="om-header-title-section">
              <h1>
                <span className="om-header-icon">📋</span>
                Order Management
              </h1>
              <p className="om-header-subtitle">Track and manage incoming orders</p>
            </div>
          </div>
          <div className="om-header-actions">
            <button className="om-btn-refresh" onClick={fetchOrders}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="om-stats">
        <div className="om-stat-card om-stat-total">
          <div className="om-stat-icon">📦</div>
          <div className="om-stat-info">
            <span className="om-stat-value">{stats.total}</span>
            <span className="om-stat-label">Total Orders</span>
          </div>
        </div>
        <div className="om-stat-card om-stat-pending">
          <div className="om-stat-icon">⏳</div>
          <div className="om-stat-info">
            <span className="om-stat-value">{stats.pending}</span>
            <span className="om-stat-label">Pending</span>
          </div>
        </div>
        <div className="om-stat-card om-stat-preparing">
          <div className="om-stat-icon">👨‍🍳</div>
          <div className="om-stat-info">
            <span className="om-stat-value">{stats.preparing}</span>
            <span className="om-stat-label">Preparing</span>
          </div>
        </div>
        <div className="om-stat-card om-stat-ready">
          <div className="om-stat-icon">🍽️</div>
          <div className="om-stat-info">
            <span className="om-stat-value">{stats.ready}</span>
            <span className="om-stat-label">Ready</span>
          </div>
        </div>
        <div className="om-stat-card om-stat-completed">
          <div className="om-stat-icon">✅</div>
          <div className="om-stat-info">
            <span className="om-stat-value">{stats.completed}</span>
            <span className="om-stat-label">Completed</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="om-filters">
        <div className="om-filters-left">
          <div className="om-search">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by customer, item, or table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="om-search-clear" onClick={() => setSearchTerm('')}>
                ✕
              </button>
            )}
          </div>

          <div className="om-filter-group">
            <label>Restaurant</label>
            <select 
              value={selectedRestaurant} 
              onChange={(e) => setSelectedRestaurant(e.target.value)}
            >
              <option value="all">All Restaurants</option>
              {restaurants.map(restaurant => (
                <option key={restaurant.rest_id || restaurant.restId} value={restaurant.rest_id || restaurant.restId}>
                  {restaurant.name}
                </option>
              ))}
            </select>
          </div>

          <div className="om-filter-group">
            <label>Status</label>
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="served">Served</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="om-filters-right">
          <div className="om-view-toggle">
            <button 
              className={`om-view-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Cards
            </button>
            <button 
              className={`om-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="om-main">
        {filteredOrders.length === 0 ? (
          <div className="om-empty">
            <div className="om-empty-icon">📭</div>
            <h3>No Orders Found</h3>
            <p>There are no orders matching your filters</p>
          </div>
        ) : viewMode === 'cards' ? (
          /* Card View - Grouped by Table */
          <div className="om-table-groups">
            {sortedTableGroups.map((group) => (
              <div key={`${group.restaurantId}-${group.tableNumber}`} className="om-table-group">
                <div className="om-table-group-header">
                  <div className="om-table-info">
                    <span className="om-table-number">
                      <span className="om-table-icon">🪑</span>
                      Table {group.tableNumber}
                    </span>
                    <span className="om-table-restaurant">{group.restaurantName}</span>
                  </div>
                  <div className="om-table-meta">
                    <span className="om-order-count">{group.orders.length} items</span>
                    <span className="om-table-total">₹{group.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="om-orders-list">
                  {group.orders.map((order) => {
                    const orderId = order.order_id || order.orderId;
                    const productName = order.product_name || order.productName;
                    const quantity = order.quantity || 1;
                    const portionSize = order.portion_size || order.portionSize;
                    const status = order.order_status || order.orderStatus;
                    const createdBy = order.created_by || order.createdBy;
                    const createdAt = order.created_at || order.createdAt;
                    const price = order.price || 0;
                    const statusInfo = getStatusInfo(status);

                    return (
                      <div key={orderId} className="om-order-card" onClick={() => openOrderDetails(order)}>
                        <div className="om-order-main">
                          <div className="om-order-item">
                            <h4>{productName}</h4>
                            <div className="om-order-details">
                              <span className="om-qty">×{quantity}</span>
                              {portionSize && <span className="om-portion">{portionSize}</span>}
                              <span className="om-price">₹{(price * quantity).toFixed(2)}</span>
                            </div>
                          </div>
                          <div className={`om-status-badge ${statusInfo.class}`}>
                            <span>{statusInfo.icon}</span>
                            <span>{statusInfo.label}</span>
                          </div>
                        </div>
                        
                        <div className="om-order-footer">
                          <div className="om-order-customer">
                            <span className="om-customer-icon">👤</span>
                            <span>{createdBy || 'Guest'}</span>
                          </div>
                          <div className="om-order-time">
                            <span className="om-time-icon">🕐</span>
                            <span>{getTimeSince(createdAt)}</span>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="om-quick-actions" onClick={(e) => e.stopPropagation()}>
                          {status?.toLowerCase() === 'pending' && (
                            <>
                              <button 
                                className="om-action-btn om-action-confirm"
                                onClick={() => updateOrderStatus(orderId, 'confirmed')}
                              >
                                Confirm
                              </button>
                              <button 
                                className="om-action-btn om-action-cancel"
                                onClick={() => updateOrderStatus(orderId, 'cancelled')}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {status?.toLowerCase() === 'confirmed' && (
                            <button 
                              className="om-action-btn om-action-prepare"
                              onClick={() => updateOrderStatus(orderId, 'preparing')}
                            >
                              Start Preparing
                            </button>
                          )}
                          {status?.toLowerCase() === 'preparing' && (
                            <button 
                              className="om-action-btn om-action-ready"
                              onClick={() => updateOrderStatus(orderId, 'ready')}
                            >
                              Mark Ready
                            </button>
                          )}
                          {status?.toLowerCase() === 'ready' && (
                            <button 
                              className="om-action-btn om-action-serve"
                              onClick={() => updateOrderStatus(orderId, 'served')}
                            >
                              Mark Served
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="om-table-container">
            <table className="om-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Table</th>
                  <th>Customer</th>
                  <th>Restaurant</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const orderId = order.order_id || order.orderId;
                  const productName = order.product_name || order.productName;
                  const quantity = order.quantity || 1;
                  const portionSize = order.portion_size || order.portionSize;
                  const status = order.order_status || order.orderStatus;
                  const createdBy = order.created_by || order.createdBy;
                  const createdAt = order.created_at || order.createdAt;
                  const price = order.price || 0;
                  const tableNumber = order.table_number || order.tableNumber;
                  const restaurantId = order.restaurant_id || order.restaurantId;
                  const statusInfo = getStatusInfo(status);

                  return (
                    <tr key={orderId} onClick={() => openOrderDetails(order)}>
                      <td className="om-cell-id">#{orderId?.slice(-6) || 'N/A'}</td>
                      <td className="om-cell-item">
                        <span className="om-item-name">{productName}</span>
                        {portionSize && <span className="om-item-portion">{portionSize}</span>}
                      </td>
                      <td className="om-cell-qty">{quantity}</td>
                      <td className="om-cell-price">₹{(price * quantity).toFixed(2)}</td>
                      <td className="om-cell-table">
                        <span className="om-table-badge-sm">🪑 {tableNumber}</span>
                      </td>
                      <td className="om-cell-customer">{createdBy || 'Guest'}</td>
                      <td className="om-cell-restaurant">{getRestaurantName(restaurantId)}</td>
                      <td className="om-cell-status">
                        <span className={`om-status-pill ${statusInfo.class}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </td>
                      <td className="om-cell-time">
                        <span className="om-time-primary">{formatTime(createdAt)}</span>
                        <span className="om-time-secondary">{getTimeSince(createdAt)}</span>
                      </td>
                      <td className="om-cell-actions" onClick={(e) => e.stopPropagation()}>
                        <select 
                          value={status}
                          onChange={(e) => updateOrderStatus(orderId, e.target.value)}
                          className="om-status-select"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="preparing">Preparing</option>
                          <option value="ready">Ready</option>
                          <option value="served">Served</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Order Detail Modal */}
      {showOrderModal && selectedOrder && (
        <div className="om-modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="om-modal" onClick={(e) => e.stopPropagation()}>
            <div className="om-modal-header">
              <h2>Order Details</h2>
              <button className="om-modal-close" onClick={() => setShowOrderModal(false)}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="om-modal-body">
              {(() => {
                const orderId = selectedOrder.order_id || selectedOrder.orderId;
                const productName = selectedOrder.product_name || selectedOrder.productName;
                const quantity = selectedOrder.quantity || 1;
                const portionSize = selectedOrder.portion_size || selectedOrder.portionSize;
                const status = selectedOrder.order_status || selectedOrder.orderStatus;
                const createdBy = selectedOrder.created_by || selectedOrder.createdBy;
                const createdAt = selectedOrder.created_at || selectedOrder.createdAt;
                const price = selectedOrder.price || 0;
                const tableNumber = selectedOrder.table_number || selectedOrder.tableNumber;
                const restaurantId = selectedOrder.restaurant_id || selectedOrder.restaurantId;
                const statusInfo = getStatusInfo(status);

                return (
                  <>
                    <div className="om-modal-section">
                      <div className="om-modal-order-id">
                        <span>Order ID</span>
                        <span>#{orderId || 'N/A'}</span>
                      </div>
                      <div className={`om-modal-status ${statusInfo.class}`}>
                        <span>{statusInfo.icon}</span>
                        <span>{statusInfo.label}</span>
                      </div>
                    </div>

                    <div className="om-modal-section om-modal-item-section">
                      <h4>Item Details</h4>
                      <div className="om-modal-item">
                        <div className="om-modal-item-info">
                          <span className="om-modal-item-name">{productName}</span>
                          {portionSize && (
                            <span className="om-modal-item-portion">{portionSize}</span>
                          )}
                        </div>
                        <div className="om-modal-item-price">
                          <span className="om-modal-qty">×{quantity}</span>
                          <span className="om-modal-amount">₹{(price * quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="om-modal-section">
                      <h4>Order Information</h4>
                      <div className="om-modal-info-grid">
                        <div className="om-modal-info-item">
                          <span className="om-modal-info-icon">🪑</span>
                          <div>
                            <span className="om-modal-info-label">Table</span>
                            <span className="om-modal-info-value">Table {tableNumber}</span>
                          </div>
                        </div>
                        <div className="om-modal-info-item">
                          <span className="om-modal-info-icon">🏪</span>
                          <div>
                            <span className="om-modal-info-label">Restaurant</span>
                            <span className="om-modal-info-value">{getRestaurantName(restaurantId)}</span>
                          </div>
                        </div>
                        <div className="om-modal-info-item">
                          <span className="om-modal-info-icon">👤</span>
                          <div>
                            <span className="om-modal-info-label">Customer</span>
                            <span className="om-modal-info-value">{createdBy || 'Guest'}</span>
                          </div>
                        </div>
                        <div className="om-modal-info-item">
                          <span className="om-modal-info-icon">🕐</span>
                          <div>
                            <span className="om-modal-info-label">Order Time</span>
                            <span className="om-modal-info-value">{formatDateTime(createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="om-modal-section">
                      <h4>Update Status</h4>
                      <div className="om-modal-status-actions">
                        {['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'].map((s) => {
                          const sInfo = getStatusInfo(s);
                          return (
                            <button
                              key={s}
                              className={`om-modal-status-btn ${sInfo.class} ${status?.toLowerCase() === s ? 'active' : ''}`}
                              onClick={() => updateOrderStatus(orderId, s)}
                            >
                              <span>{sInfo.icon}</span>
                              <span>{sInfo.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
