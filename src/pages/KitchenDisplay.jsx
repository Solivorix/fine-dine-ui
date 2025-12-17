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
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const STATUS_CONFIG = [
    { value: 'pending', label: 'New Orders', color: '#f59e0b', bg: '#fef3c7', icon: '🆕' },
    { value: 'confirmed', label: 'Confirmed', color: '#3b82f6', bg: '#dbeafe', icon: '✅' },
    { value: 'preparing', label: 'In Kitchen', color: '#8b5cf6', bg: '#ede9fe', icon: '👨‍🍳' },
    { value: 'ready', label: 'Ready', color: '#10b981', bg: '#d1fae5', icon: '🍽️' }
  ];

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, restaurantsRes, itemsRes] = await Promise.all([
        orderAPI.getAll(),
        restaurantAPI.getAll(),
        itemAPI.getAll()
      ]);

      const ordersData = ordersRes.data || [];
      const activeOrders = ordersData.filter(order => {
        const status = order.orderStatus || order.order_status || 'pending';
        return ['pending', 'confirmed', 'preparing', 'ready'].includes(status);
      });

      activeOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      setOrders(activeOrders);
      setRestaurants(restaurantsRes.data || []);
      setItems(itemsRes.data || []);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to load orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const getItemDetails = (productId) => {
    return items.find(i => 
      (i.itemId || i.productId) === productId
    ) || { productName: 'Unknown Item' };
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
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
    
    if (diffMins < 10) return '#10b981';
    if (diffMins < 20) return '#f59e0b';
    return '#ef4444';
  };

  // FIX #2: Check if order is within 2-minute modification window
  const isWithinModificationWindow = (createdAt) => {
    if (!createdAt) return false;
    const diffMs = new Date() - new Date(createdAt);
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins < 2; // Within 2 minutes
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      
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
      fetchData();
    }
  };

  const handleMarkServed = async (orderId) => {
    try {
      await orderAPI.updateStatus(orderId, 'served');
      
      setOrders(prevOrders => 
        prevOrders.filter(order => order.orderId !== orderId)
      );
    } catch (err) {
      console.error('Error marking order as served:', err);
      alert('Failed to mark order as served');
    }
  };

  // FIX #4: Add print functionality
  const handlePrintOrder = (order) => {
    const item = getItemDetails(order.productId);
    const restaurant = restaurants.find(r => 
      (r.rest_id || r.restId) === order.restaurantId
    );

    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Kitchen Order #${order.orderId}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              padding: 20mm;
              max-width: 80mm;
              margin: 0 auto;
              background: white;
            }
            .header {
              text-align: center;
              background: #000;
              color: #fff;
              padding: 15px;
              margin-bottom: 15px;
              font-size: 20px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .order-id {
              text-align: center;
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0;
            }
            .divider {
              border-top: 2px dashed #000;
              margin: 15px 0;
            }
            .divider-thick {
              border-top: 4px solid #000;
              margin: 15px 0;
            }
            .critical {
              background: #000;
              color: #fff;
              padding: 15px;
              text-align: center;
              margin: 10px 0;
            }
            .table-info {
              font-size: 28px;
              font-weight: bold;
              margin: 5px 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
              font-size: 14px;
              line-height: 1.5;
            }
            .label {
              font-weight: bold;
            }
            .item-section {
              margin: 15px 0;
            }
            .item-section h2 {
              font-size: 16px;
              font-weight: bold;
              text-transform: uppercase;
              border-bottom: 3px solid #000;
              padding-bottom: 5px;
              margin-bottom: 10px;
            }
            .item-main {
              background: #f5f5f5;
              padding: 15px;
              border: 3px solid #000;
            }
            .item-name {
              font-size: 20px;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 10px;
              line-height: 1.3;
            }
            .item-details {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              font-size: 15px;
            }
            .item-details strong {
              font-size: 18px;
            }
            .price-info {
              display: flex;
              justify-content: space-between;
              margin-top: 10px;
              padding-top: 10px;
              border-top: 2px solid #000;
              font-size: 14px;
            }
            .total-price {
              font-size: 18px;
              font-weight: bold;
            }
            .notes-section {
              background: #fff9c4;
              border: 3px solid #fbc02d;
              padding: 15px;
              margin: 15px 0;
            }
            .notes-section h2 {
              font-size: 16px;
              font-weight: bold;
              background: #ffeb3b;
              color: #000;
              padding: 8px;
              margin: -15px -15px 10px -15px;
              text-align: center;
            }
            .note-item {
              margin: 8px 0;
            }
            .note-label {
              font-weight: bold;
              margin-bottom: 5px;
            }
            .note-content {
              font-size: 14px;
              line-height: 1.4;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
            }
            .priority {
              background: #f44336;
              color: #fff;
              font-size: 16px;
              font-weight: bold;
              padding: 15px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            @media print {
              body { 
                padding: 10mm;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">🍳 KITCHEN ORDER</div>
          <div class="order-id">Order #${order.orderId}</div>
          
          <div class="divider"></div>
          
          <div class="critical">
            <div class="table-info">TABLE: #${order.tableNumber || '-'}</div>
            <div style="font-size: 12px; margin-top: 8px;">
              ${new Date(order.createdAt).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="info-row">
            <span class="label">Restaurant:</span>
            <span>${restaurant?.name || 'Unknown'}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Customer:</span>
            <span>${order.createdBy || 'Guest'}</span>
          </div>
          
          ${order.customerPhone ? `
            <div class="info-row">
              <span class="label">Phone:</span>
              <span>${order.customerPhone}</span>
            </div>
          ` : ''}
          
          <div class="divider-thick"></div>
          
          <div class="item-section">
            <h2>ORDER ITEM:</h2>
            <div class="item-main">
              <div class="item-name">${item.productName || 'Unknown Item'}</div>
              
              <div class="item-details">
                <div>Quantity: <strong>×${order.quantity || 1}</strong></div>
                ${order.portionSize ? `<div>Size: <strong>${order.portionSize.toUpperCase()}</strong></div>` : ''}
              </div>
              
              <div class="price-info">
                <span>Unit Price: ₹${order.price || 0}</span>
                <span class="total-price">TOTAL: ₹${(order.price || 0) * (order.quantity || 1)}</span>
              </div>
            </div>
          </div>
          
          ${(order.itemNotes || order.orderNotes) ? `
            <div class="divider-thick"></div>
            <div class="notes-section">
              <h2>⚠️ SPECIAL INSTRUCTIONS:</h2>
              ${order.itemNotes ? `
                <div class="note-item">
                  <div class="note-label">🍴 Item Notes:</div>
                  <div class="note-content">${order.itemNotes}</div>
                </div>
              ` : ''}
              ${order.orderNotes ? `
                <div class="note-item">
                  <div class="note-label">📝 Order Notes:</div>
                  <div class="note-content">${order.orderNotes}</div>
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          <div class="divider-thick"></div>
          
          <div class="footer">
            <div class="priority">🔥 PREPARE IMMEDIATELY</div>
          </div>
          
          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
              🖨️ Print
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px;">
              Close
            </button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // GROUP ORDERS BY TABLE AND PHONE
  const groupOrders = (ordersList) => {
    const groups = {};
    
    ordersList.forEach(order => {
      const phone = order.customerPhone || 'no-phone';
      const table = order.tableNumber || 'no-table';
      const groupKey = `table-${table}-phone-${phone}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          tableNumber: order.tableNumber,
          customerName: order.createdBy || 'Guest',
          customerPhone: order.customerPhone,
          restaurantId: order.restaurantId,
          orders: [],
          firstOrderTime: order.createdAt
        };
      }
      
      groups[groupKey].orders.push(order);
    });
    
    return Object.values(groups).sort((a, b) => 
      new Date(a.firstOrderTime) - new Date(b.firstOrderTime)
    );
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const getEarliestOrderTime = (groupOrders) => {
    const times = groupOrders.map(o => new Date(o.createdAt)).filter(t => !isNaN(t));
    if (times.length === 0) return null;
    return new Date(Math.min(...times));
  };

  const filteredOrders = selectedRestaurant === 'all'
    ? orders
    : orders.filter(order => order.restaurantId === selectedRestaurant);

  const orderGroups = groupOrders(filteredOrders);

  // FIX #3: Properly calculate stats from filtered orders
  const groupedByStatus = STATUS_CONFIG.map(statusConfig => {
    const statusOrders = filteredOrders.filter(order => {
      const orderStatus = order.orderStatus || order.order_status || 'pending';
      return orderStatus === statusConfig.value;
    });
    
    return {
      ...statusConfig,
      orders: statusOrders,
      count: statusOrders.length,
      groups: groupOrders(statusOrders)
    };
  });

  if (loading) {
    return (
      <div className="kds-container">
        <div className="kds-loading">
          <div className="loading-spinner"></div>
          <p>Loading kitchen orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kds-container">
      <div className="kds-header">
        <div className="kds-header-left">
          <button className="btn-back" onClick={() => navigate('/admin')}>
            <span className="back-icon">←</span>
            <span className="back-text">Back</span>
          </button>
          <div className="kds-title-section">
            <h1>Kitchen Display</h1>
            <p className="kds-subtitle">Active orders • Table grouped</p>
          </div>
        </div>

        <div className="kds-header-right">
          <select
            className="kds-restaurant-select"
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

          <button 
            className={`btn-auto-refresh ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          >
            <span>{autoRefresh ? '🔄' : '⏸️'}</span>
            <span className="refresh-text">{autoRefresh ? 'Auto' : 'Manual'}</span>
          </button>

          <button className="btn-kds-refresh" onClick={fetchData}>
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="kds-error">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* FIX #3: Use groupedByStatus for accurate counts */}
      <div className="kds-stats">
        {groupedByStatus.map(status => (
          <div key={status.value} className="kds-stat-card" style={{ borderLeftColor: status.color }}>
            <span className="stat-icon">{status.icon}</span>
            <div className="stat-content">
              <span className="stat-value">{status.count}</span>
              <span className="stat-label">{status.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="kds-last-update">
        Last updated: {lastUpdate.toLocaleTimeString('en-IN')}
      </div>

      <div className="kds-content">
        {groupedByStatus.map(statusConfig => {
          if (statusConfig.groups.length === 0) return null;

          return (
            <div key={statusConfig.value} className="kds-status-section">
              <div className="kds-status-header" style={{ backgroundColor: statusConfig.bg }}>
                <span className="status-icon">{statusConfig.icon}</span>
                <span className="status-title" style={{ color: statusConfig.color }}>
                  {statusConfig.label}
                </span>
                <span className="status-count" style={{ backgroundColor: statusConfig.color }}>
                  {statusConfig.groups.length} tables
                </span>
              </div>

              <div className="kds-orders-grid">
                {statusConfig.groups.map(group => {
                  const isExpanded = expandedGroups.has(group.key);
                  const earliestTime = getEarliestOrderTime(group.orders);
                  const totalItems = group.orders.reduce((sum, o) => sum + (o.quantity || 1), 0);

                  return (
                    <div key={group.key} className="kds-order-group-card">
                      {/* Group Header - Click to expand/collapse */}
                      <div 
                        className="kds-group-header"
                        onClick={() => toggleGroup(group.key)}
                      >
                        <div className="group-table-number">
                          <span className="table-icon">🍽️</span>
                          <span className="table-text">Table {group.tableNumber}</span>
                        </div>

                        <div className="group-customer-info">
                          <div className="customer-name">
                            <span className="customer-icon">👤</span>
                            <span>{group.customerName}</span>
                          </div>
                          {group.customerPhone && (
                            <div className="customer-phone">
                              <span>📱</span>
                              <span>{group.customerPhone}</span>
                            </div>
                          )}
                        </div>

                        <div className="group-summary-info">
                          <div className="summary-badge">
                            <span className="badge-label">Orders:</span>
                            <span className="badge-value">{group.orders.length}</span>
                          </div>
                          <div className="summary-badge">
                            <span className="badge-label">Items:</span>
                            <span className="badge-value">{totalItems}</span>
                          </div>
                        </div>

                        {earliestTime && (
                          <div 
                            className="group-time-badge"
                            style={{ color: getTimeColor(earliestTime) }}
                          >
                            <span>⏱️</span>
                            <span>{formatTime(earliestTime)}</span>
                          </div>
                        )}

                        <div className="group-expand-arrow">
                          {isExpanded ? '▼' : '▶'}
                        </div>
                      </div>

                      {/* Group Orders - Show when expanded */}
                      {isExpanded && (
                        <div className="kds-group-orders">
                          {group.orders.map(order => {
                            const item = getItemDetails(order.productId);
                            const orderStatus = order.orderStatus || order.order_status || 'pending';
                            const currentStatusConfig = STATUS_CONFIG.find(s => s.value === orderStatus);
                            const withinModWindow = isWithinModificationWindow(order.createdAt);

                            return (
                              <div 
                                key={order.orderId} 
                                className="kds-order-item"
                                style={{ borderLeftColor: currentStatusConfig?.color }}
                              >
                                <div className="order-item-header">
                                  {/* FIX #1: Hide DB ID, show friendly format */}
                                  <span className="order-id-badge">Order #{order.orderId}</span>
                                  <span 
                                    className="order-time"
                                    style={{ color: getTimeColor(order.createdAt) }}
                                  >
                                    ⏱️ {formatTime(order.createdAt)}
                                  </span>
                                </div>

                                <div className="order-item-details">
                                  <div className="item-name-section">
                                    <h3 className="item-name">{item.productName}</h3>
                                    <div className="item-meta">
                                      {order.portionSize && (
                                        <span className="portion-badge">{order.portionSize}</span>
                                      )}
                                      <span className="quantity-badge">×{order.quantity || 1}</span>
                                      <span className="price-badge">₹{order.price || 0}</span>
                                    </div>
                                  </div>

                                  {(order.orderNotes || order.itemNotes) && (
                                    <div className="order-notes-section">
                                      {order.itemNotes && (
                                        <div className="note-item">
                                          <span className="note-icon">🍴</span>
                                          <span className="note-text">{order.itemNotes}</span>
                                        </div>
                                      )}
                                      {order.orderNotes && (
                                        <div className="note-item">
                                          <span className="note-icon">📝</span>
                                          <span className="note-text">{order.orderNotes}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* FIX #2: Show modification timer warning if within window */}
                                {withinModWindow && statusConfig.value === 'pending' && (
                                  <div className="modification-timer-warning">
                                    ⏳ Customer can modify this order for {2 - Math.floor((new Date() - new Date(order.createdAt)) / 60000)} more minute(s)
                                  </div>
                                )}

                                <div className="kds-order-actions">
                                  {/* FIX #4: Print button */}
                                  <button 
                                    className="btn-print-order"
                                    onClick={() => handlePrintOrder(order)}
                                    title="Print Kitchen Order"
                                  >
                                    🖨️
                                  </button>
                                  
                                  {/* FIX #2: Disable status change if within modification window */}
                                  {statusConfig.value === 'pending' && (
                                    <button 
                                      className="btn-kds-action btn-confirm"
                                      onClick={() => handleStatusChange(order.orderId, 'confirmed')}
                                      disabled={withinModWindow}
                                      title={withinModWindow ? 'Wait for customer modification timer' : 'Confirm order'}
                                      style={withinModWindow ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                    >
                                      {withinModWindow ? '⏳ Wait' : '✓ Confirm'}
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
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {orderGroups.length === 0 && (
        <div className="kds-empty-state">
          <span className="empty-icon">🍽️</span>
          <h3>No Active Orders</h3>
          <p>New orders will appear here automatically</p>
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;
