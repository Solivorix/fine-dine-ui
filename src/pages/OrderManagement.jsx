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
      const [ordersRes, restaurantsRes, itemsRes] = await Promise.all([
        orderAPI.getAll(),
        restaurantAPI.getAll(),
        itemAPI.getAll()
      ]);
      console.log('Orders response:', ordersRes.data);
      console.log('Restaurants response:', restaurantsRes.data);
      console.log('Items response:', itemsRes.data);
      setOrders(ordersRes.data || []);
      setRestaurants(restaurantsRes.data || []);
      setItems(itemsRes.data || []);
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
        order.orderId === orderId 
          ? { ...order, orderStatus: newStatus }
          : order
      ));
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder({ ...selectedOrder, orderStatus: newStatus });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const getRestaurantName = (restaurantId) => {
    const restaurant = restaurants.find(r => r.restId === restaurantId);
    return restaurant?.name || 'Unknown';
  };

  // Get product name from productId (orders store productId, not productName)
  const getProductName = (productId) => {
    const item = items.find(i => i.itemId === productId);
    return item?.productName || productId || 'Unknown Item';
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

  // Helper to get order field (camelCase)
  const getOrderField = (order, field) => {
    if (!order) return undefined;
    return order[field];
  };

  const filteredOrders = orders.filter(order => {
    const restaurantId = getOrderField(order, 'restaurantId');
    const status = getOrderField(order, 'orderStatus');
    const createdBy = getOrderField(order, 'createdBy') || '';
    const productId = getOrderField(order, 'productId') || '';
    const productName = getProductName(productId);
    const tableNumber = getOrderField(order, 'tableNumber');

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
    const tableNumber = getOrderField(order, 'tableNumber');
    const restaurantId = getOrderField(order, 'restaurantId');
    const key = `${restaurantId}-${tableNumber}`;
    
    if (!acc[key]) {
      acc[key] = {
        tableNumber,
        restaurantId,
        restaurantName: getRestaurantName(restaurantId),
        orders: [],
        totalAmount: 0,
        latestTime: null,
        customerName: getOrderField(order, 'createdBy'),
        customerPhone: getOrderField(order, 'customerPhone'),
        orderNotes: getOrderField(order, 'orderNotes')
      };
    }
    
    const price = order.price || 0;
    const quantity = order.quantity || 1;
    acc[key].orders.push(order);
    acc[key].totalAmount += price * quantity;
    
    const orderTime = new Date(getOrderField(order, 'createdAt'));
    if (!acc[key].latestTime || orderTime > acc[key].latestTime) {
      acc[key].latestTime = orderTime;
    }

    // Get latest order notes if any
    const notes = getOrderField(order, 'orderNotes');
    if (notes && !acc[key].orderNotes) {
      acc[key].orderNotes = notes;
    }
    
    return acc;
  }, {});

  const sortedTableGroups = Object.values(groupedOrders).sort((a, b) => {
    return b.latestTime - a.latestTime;
  });

  // Calculate total revenue
  const totalRevenue = orders.reduce((sum, order) => {
    const price = order.price || 0;
    const quantity = order.quantity || 1;
    return sum + (price * quantity);
  }, 0);

  // Statistics
  const stats = {
    total: orders.length,
    pending: orders.filter(o => getOrderField(o, 'orderStatus')?.toLowerCase() === 'pending').length,
    preparing: orders.filter(o => getOrderField(o, 'orderStatus')?.toLowerCase() === 'preparing').length,
    ready: orders.filter(o => getOrderField(o, 'orderStatus')?.toLowerCase() === 'ready').length,
    completed: orders.filter(o => ['served', 'completed'].includes(getOrderField(o, 'orderStatus')?.toLowerCase())).length,
    revenue: totalRevenue
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleBack = () => {
    navigate(-1);
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
        <div className="om-header-left">
          <button className="om-back-btn" onClick={handleBack}>
            ← Back
          </button>
          <div>
            <h1>Order Management</h1>
            <p className="om-subtitle">Real-time order tracking and management</p>
          </div>
        </div>
        <div className="om-header-actions">
          <button className="om-refresh-btn" onClick={fetchOrders}>
            🔄 Refresh
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="om-stats">
        <div className="om-stat-card">
          <span className="om-stat-icon">📋</span>
          <div className="om-stat-info">
            <span className="om-stat-value">{stats.total}</span>
            <span className="om-stat-label">Total Orders</span>
          </div>
        </div>
        <div className="om-stat-card om-stat-pending">
          <span className="om-stat-icon">⏳</span>
          <div className="om-stat-info">
            <span className="om-stat-value">{stats.pending}</span>
            <span className="om-stat-label">Pending</span>
          </div>
        </div>
        <div className="om-stat-card om-stat-preparing">
          <span className="om-stat-icon">👨‍🍳</span>
          <div className="om-stat-info">
            <span className="om-stat-value">{stats.preparing}</span>
            <span className="om-stat-label">Preparing</span>
          </div>
        </div>
        <div className="om-stat-card om-stat-ready">
          <span className="om-stat-icon">🍽️</span>
          <div className="om-stat-info">
            <span className="om-stat-value">{stats.ready}</span>
            <span className="om-stat-label">Ready</span>
          </div>
        </div>
        <div className="om-stat-card om-stat-revenue">
          <span className="om-stat-icon">💰</span>
          <div className="om-stat-info">
            <span className="om-stat-value">₹{stats.revenue.toFixed(0)}</span>
            <span className="om-stat-label">Total Revenue</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="om-filters">
        <div className="om-search-box">
          <span className="om-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by customer, item, or table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="om-filter-group">
          <select
            value={selectedRestaurant}
            onChange={(e) => setSelectedRestaurant(e.target.value)}
          >
            <option value="all">All Restaurants</option>
            {restaurants.map(r => (
              <option key={r.restId} value={r.restId}>
                {r.name}
              </option>
            ))}
          </select>

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

          <div className="om-view-toggle">
            <button 
              className={viewMode === 'cards' ? 'active' : ''} 
              onClick={() => setViewMode('cards')}
            >
              🃏 Cards
            </button>
            <button 
              className={viewMode === 'table' ? 'active' : ''} 
              onClick={() => setViewMode('table')}
            >
              📊 Table
            </button>
          </div>
        </div>
      </div>

      {/* Orders */}
      <main className="om-main">
        {filteredOrders.length === 0 ? (
          <div className="om-empty">
            <span>📭</span>
            <h3>No orders found</h3>
            <p>Orders will appear here when customers place them</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="om-cards-grid">
            {sortedTableGroups.map((group) => (
              <div key={`${group.restaurantId}-${group.tableNumber}`} className="om-table-card">
                <div className="om-table-card-header">
                  <div className="om-table-info">
                    <span className="om-table-badge">🪑 Table {group.tableNumber}</span>
                    <span className="om-restaurant-name">{group.restaurantName}</span>
                  </div>
                  <div className="om-table-total">
                    <span className="om-total-label">Total</span>
                    <span className="om-total-amount">₹{group.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="om-customer-info">
                  <div className="om-customer-detail">
                    <span>👤</span>
                    <span>{group.customerName || 'Guest'}</span>
                  </div>
                  {group.customerPhone && (
                    <div className="om-customer-detail">
                      <span>📱</span>
                      <span>{group.customerPhone}</span>
                    </div>
                  )}
                  <div className="om-customer-detail">
                    <span>🕐</span>
                    <span>{getTimeSince(group.latestTime)}</span>
                  </div>
                </div>

                {group.orderNotes && (
                  <div className="om-order-notes">
                    <span className="om-notes-icon">📝</span>
                    <span className="om-notes-text">{group.orderNotes}</span>
                  </div>
                )}

                <div className="om-order-items">
                  {group.orders.map((order) => {
                    const orderId = getOrderField(order, 'orderId');
                    const productId = getOrderField(order, 'productId');
                    const productName = getProductName(productId);
                    const quantity = order.quantity || 1;
                    const portionSize = getOrderField(order, 'portionSize');
                    const status = getOrderField(order, 'orderStatus');
                    const price = order.price || 0;
                    const itemNotes = getOrderField(order, 'itemNotes');
                    const statusInfo = getStatusInfo(status);

                    return (
                      <div key={orderId} className="om-order-item" onClick={() => openOrderDetails(order)}>
                        <div className="om-item-main">
                          <div className="om-item-info">
                            <span className="om-item-name">{productName}</span>
                            {portionSize && <span className="om-item-portion">{portionSize}</span>}
                            {itemNotes && (
                              <span className="om-item-notes">📝 {itemNotes}</span>
                            )}
                          </div>
                          <div className="om-item-qty">×{quantity}</div>
                          <div className="om-item-price">₹{(price * quantity).toFixed(2)}</div>
                        </div>
                        <div className="om-item-status-row">
                          <span className={`om-status-pill ${statusInfo.class}`}>
                            {statusInfo.icon} {statusInfo.label}
                          </span>
                          <select
                            value={status}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateOrderStatus(orderId, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="om-quick-status"
                          >
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
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="om-table-view">
            <table className="om-data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>Table</th>
                  <th>Customer</th>
                  <th>Notes</th>
                  <th>Restaurant</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => {
                  const orderId = getOrderField(order, 'orderId');
                  const productId = getOrderField(order, 'productId');
                  const productName = getProductName(productId);
                  const quantity = order.quantity || 1;
                  const portionSize = getOrderField(order, 'portionSize');
                  const status = getOrderField(order, 'orderStatus');
                  const createdBy = getOrderField(order, 'createdBy');
                  const createdAt = getOrderField(order, 'createdAt');
                  const price = order.price || 0;
                  const tableNumber = getOrderField(order, 'tableNumber');
                  const restaurantId = getOrderField(order, 'restaurantId');
                  const itemNotes = getOrderField(order, 'itemNotes');
                  const orderNotes = getOrderField(order, 'orderNotes');
                  const statusInfo = getStatusInfo(status);

                  return (
                    <tr key={orderId || index} onClick={() => openOrderDetails(order)}>
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
                      <td className="om-cell-notes">
                        {(itemNotes || orderNotes) ? (
                          <span className="om-notes-badge" title={itemNotes || orderNotes}>
                            📝 {(itemNotes || orderNotes).substring(0, 20)}{(itemNotes || orderNotes).length > 20 ? '...' : ''}
                          </span>
                        ) : '-'}
                      </td>
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
                          value={status || 'pending'}
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
                ✕
              </button>
            </div>

            <div className="om-modal-body">
              {(() => {
                const orderId = getOrderField(selectedOrder, 'orderId');
                const productName = getOrderField(selectedOrder, 'productName');
                const quantity = selectedOrder.quantity || 1;
                const portionSize = getOrderField(selectedOrder, 'portionSize');
                const status = getOrderField(selectedOrder, 'orderStatus');
                const createdBy = getOrderField(selectedOrder, 'createdBy');
                const createdAt = getOrderField(selectedOrder, 'createdAt');
                const price = selectedOrder.price || 0;
                const tableNumber = getOrderField(selectedOrder, 'tableNumber');
                const restaurantId = getOrderField(selectedOrder, 'restaurantId');
                const customerPhone = getOrderField(selectedOrder, 'customerPhone');
                const orderNotes = getOrderField(selectedOrder, 'orderNotes');
                const itemNotes = getOrderField(selectedOrder, 'itemNotes');
                const statusInfo = getStatusInfo(status);

                return (
                  <>
                    <div className="om-modal-section">
                      <div className={`om-modal-status ${statusInfo.class}`}>
                        <span>{statusInfo.icon}</span>
                        <span>{statusInfo.label}</span>
                      </div>
                    </div>

                    <div className="om-modal-section om-modal-item-section">
                      <h4>Item Details</h4>
                      <div className="om-modal-item">
                        <div className="om-modal-item-info">
                          <span className="om-modal-item-name">{productName || 'Unknown Item'}</span>
                          {portionSize && (
                            <span className="om-modal-item-portion">{portionSize}</span>
                          )}
                        </div>
                        <div className="om-modal-item-price">
                          <span className="om-modal-qty">×{quantity}</span>
                          <span className="om-modal-amount">₹{(price * quantity).toFixed(2)}</span>
                        </div>
                      </div>

                      {itemNotes && (
                        <div className="om-modal-notes">
                          <span className="om-modal-notes-label">📝 Item Instructions:</span>
                          <p>{itemNotes}</p>
                        </div>
                      )}
                    </div>

                    <div className="om-modal-section">
                      <h4>Order Information</h4>
                      <div className="om-modal-info-grid">
                        <div className="om-modal-info-item">
                          <span className="om-modal-info-icon">🪑</span>
                          <div>
                            <span className="om-modal-info-label">Table</span>
                            <span className="om-modal-info-value">Table {tableNumber || 'N/A'}</span>
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
                          <span className="om-modal-info-icon">📱</span>
                          <div>
                            <span className="om-modal-info-label">Phone</span>
                            <span className="om-modal-info-value">{customerPhone || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="om-modal-info-item">
                          <span className="om-modal-info-icon">🕐</span>
                          <div>
                            <span className="om-modal-info-label">Order Time</span>
                            <span className="om-modal-info-value">{formatDateTime(createdAt)}</span>
                          </div>
                        </div>
                        <div className="om-modal-info-item">
                          <span className="om-modal-info-icon">💰</span>
                          <div>
                            <span className="om-modal-info-label">Amount</span>
                            <span className="om-modal-info-value om-amount-highlight">₹{(price * quantity).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {orderNotes && (
                      <div className="om-modal-section">
                        <h4>📝 Customer Notes</h4>
                        <div className="om-modal-customer-notes">
                          <p>{orderNotes}</p>
                        </div>
                      </div>
                    )}

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
