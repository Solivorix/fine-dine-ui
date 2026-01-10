import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { orderAPI, restaurantAPI, itemAPI } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faSync, faPause, faUtensils, faUser, faMobile, faClock,
  faChevronDown, faChevronRight, faPrint, faCheck, faKitchenSet, faBell,
  faExclamationTriangle, faHourglass, faSquarePlus, faNoteSticky
} from '@fortawesome/free-solid-svg-icons';
import './KitchenDisplay.css';

const KitchenDisplay = () => {
  const navigate = useNavigate();
  const { isAdmin, getUserRestaurantId } = useAuth();
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [items, setItems] = useState([]);

  // For non-admin users, default to their restaurant
  const userRestaurantId = getUserRestaurantId();
  const [selectedRestaurant, setSelectedRestaurant] = useState(userRestaurantId || 'all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  
  // AUTO-PRINT CONTROLS
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(() => {
    const saved = localStorage.getItem('autoPrintEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  // AUTO-STATUS PROGRESSION CONTROLS
  const [autoStatusEnabled, setAutoStatusEnabled] = useState(() => {
    const saved = localStorage.getItem('autoStatusEnabled');
    return saved !== null ? JSON.parse(saved) : false; // Default: OFF for safety
  });
  
  const [autoPrintedOrders, setAutoPrintedOrders] = useState(new Set());
  const [recentlyPrintedGroups, setRecentlyPrintedGroups] = useState(new Set());

  // AUTO-STATUS TIME INTERVALS (in minutes)
  const STATUS_TIMINGS = {
    confirmed_to_preparing: 2,   // 2 minutes after confirmation
    preparing_to_ready: 15,       // 15 minutes of cooking
    ready_to_served: 5            // 5 minutes to serve
  };

  const STATUS_CONFIG = [
    { value: 'pending', label: 'New Orders', color: '#f59e0b', bg: '#fef3c7', icon: faSquarePlus },
    { value: 'confirmed', label: 'Confirmed', color: '#3b82f6', bg: '#dbeafe', icon: faCheck },
    { value: 'preparing', label: 'In Kitchen', color: '#8b5cf6', bg: '#ede9fe', icon: faKitchenSet },
    { value: 'ready', label: 'Ready', color: '#10b981', bg: '#d1fae5', icon: faUtensils }
  ];

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('autoPrintEnabled', JSON.stringify(autoPrintEnabled));
  }, [autoPrintEnabled]);

  useEffect(() => {
    localStorage.setItem('autoStatusEnabled', JSON.stringify(autoStatusEnabled));
  }, [autoStatusEnabled]);

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

  // AUTO-PRINT: Only runs if autoPrintEnabled is true
  useEffect(() => {
    if (!autoPrintEnabled) return;

    const checkAutoPrint = setInterval(() => {
      const groups = groupOrders(orders);

      groups.forEach(group => {
        // Check if any order in this group needs auto-printing
        const needsPrinting = group.orders.some(order => 
          (order.orderStatus === 'pending' || !order.orderStatus) &&
          !autoPrintedOrders.has(order.orderId) &&
          !isWithinModificationWindow(order.createdAt)
        );

        // Check if this group was recently printed (cooldown)
        const groupKey = `${group.tableNumber}-${group.customerPhone}`;
        
        if (needsPrinting && !recentlyPrintedGroups.has(groupKey)) {
          console.log('🖨️ AUTO-PRINT triggered for table:', group.tableNumber);
          
          // Add to cooldown set
          setRecentlyPrintedGroups(prev => new Set([...prev, groupKey]));
          
          // Remove from cooldown after 30 seconds
          setTimeout(() => {
            setRecentlyPrintedGroups(prev => {
              const newSet = new Set(prev);
              newSet.delete(groupKey);
              return newSet;
            });
          }, 30000);
          
          handleAutoPrint(group.orders[0]); // Pass any order from the group
        }
      });
    }, 5000);

    return () => clearInterval(checkAutoPrint);
  }, [orders, autoPrintedOrders, autoPrintEnabled, recentlyPrintedGroups]);

  // AUTO-STATUS PROGRESSION: Only runs if both auto-print AND auto-status are enabled
  useEffect(() => {
    if (!autoPrintEnabled || !autoStatusEnabled) return;

    const checkAutoStatus = setInterval(() => {
      const processedOrders = new Set();

      orders.forEach(order => {
        // Skip if already processed this cycle
        if (processedOrders.has(order.orderId)) return;

        const orderStatus = order.orderStatus || order.order_status || 'pending';
        const statusChangeTime = order.statusChangedAt || order.createdAt;
        const minutesSinceChange = getMinutesSince(statusChangeTime);

        let shouldUpdate = false;
        let newStatus = '';

        // confirmed → preparing
        if (orderStatus === 'confirmed' && minutesSinceChange >= STATUS_TIMINGS.confirmed_to_preparing) {
          shouldUpdate = true;
          newStatus = 'preparing';
        }
        // preparing → ready
        else if (orderStatus === 'preparing' && minutesSinceChange >= STATUS_TIMINGS.preparing_to_ready) {
          shouldUpdate = true;
          newStatus = 'ready';
        }
        // ready → served
        else if (orderStatus === 'ready' && minutesSinceChange >= STATUS_TIMINGS.ready_to_served) {
          shouldUpdate = true;
          newStatus = 'served';
        }

        if (shouldUpdate) {
          processedOrders.add(order.orderId);
          console.log(`🤖 AUTO-STATUS: ${orderStatus} → ${newStatus} for order:`, order.orderId);
          
          if (newStatus === 'served') {
            handleMarkServed(order.orderId);
          } else {
            handleStatusChange(order.orderId, newStatus);
          }
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkAutoStatus);
  }, [orders, autoPrintEnabled, autoStatusEnabled]);

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

  const isWithinModificationWindow = (createdAt) => {
    if (!createdAt) return false;
    const diffMs = new Date() - new Date(createdAt);
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins < 2;
  };

  const getMinutesSince = (dateStr) => {
    if (!dateStr) return 0;
    const diffMs = new Date() - new Date(dateStr);
    return Math.floor(diffMs / 60000);
  };

  // Calculate time remaining until next auto-status change
  const getTimeUntilNextStatus = (order) => {
    if (!autoPrintEnabled || !autoStatusEnabled) return null;
    
    const orderStatus = order.orderStatus || order.order_status || 'pending';
    const statusChangeTime = order.statusChangedAt || order.createdAt;
    const minutesSinceChange = getMinutesSince(statusChangeTime);
    
    let targetMinutes = 0;
    let nextStatus = '';
    
    if (orderStatus === 'confirmed') {
      targetMinutes = STATUS_TIMINGS.confirmed_to_preparing;
      nextStatus = 'Preparing';
    } else if (orderStatus === 'preparing') {
      targetMinutes = STATUS_TIMINGS.preparing_to_ready;
      nextStatus = 'Ready';
    } else if (orderStatus === 'ready') {
      targetMinutes = STATUS_TIMINGS.ready_to_served;
      nextStatus = 'Served';
    }
    
    const remainingMinutes = targetMinutes - minutesSinceChange;
    
    if (remainingMinutes <= 0) return null;
    
    return {
      minutes: remainingMinutes,
      seconds: 60 - (Math.floor((new Date() - new Date(statusChangeTime)) / 1000) % 60),
      nextStatus
    };
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.orderId === orderId 
            ? { 
                ...order, 
                orderStatus: newStatus, 
                order_status: newStatus,
                statusChangedAt: new Date().toISOString()
              }
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

  const handleAutoPrint = (order) => {
    const groups = groupOrders(orders);
    const group = groups.find(g => 
      g.orders.some(o => o.orderId === order.orderId)
    );
    
    if (group) {
      const groupOrderIds = group.orders.map(o => o.orderId);
      setAutoPrintedOrders(prev => {
        const newSet = new Set(prev);
        groupOrderIds.forEach(id => newSet.add(id));
        return newSet;
      });
      
      handlePrintTableOrder(group, true);
      
      group.orders.forEach(o => {
        if (o.orderStatus === 'pending' || !o.orderStatus) {
          handleStatusChange(o.orderId, 'confirmed');
        }
      });
    }
  };

  const handlePrintTableOrder = (group, isAutoPrint = false) => {
    const restaurant = restaurants.find(r => 
      (r.rest_id || r.restId) === group.restaurantId
    );

    const printWindow = window.open('', '', 'width=800,height=600');
    
    let subtotal = 0;
    const itemsHTML = group.orders.map(order => {
      const item = getItemDetails(order.productId);
      const itemTotal = (order.price || 0) * (order.quantity || 1);
      subtotal += itemTotal;
      
      return `
        <div class="order-item">
          <div class="item-header">
            <div class="item-name">${item.productName || 'Unknown Item'}</div>
            <div class="item-price">₹${itemTotal}</div>
          </div>
          <div class="item-details">
            <span class="detail-badge">Qty: ×${order.quantity || 1}</span>
            ${order.portionSize ? `<span class="detail-badge">${order.portionSize.toUpperCase()}</span>` : ''}
            <span class="detail-badge">₹${order.price || 0} each</span>
          </div>
          ${(order.itemNotes || order.orderNotes) ? `
            <div class="item-notes">
              ${order.itemNotes ? `<div class="note-line"><strong>🍴 Item:</strong> ${order.itemNotes}</div>` : ''}
              ${order.orderNotes ? `<div class="note-line"><strong>📝 Order:</strong> ${order.orderNotes}</div>` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Kitchen Order - Table ${group.tableNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: 80mm auto; margin: 5mm; }
            body {
              font-family: 'Courier New', monospace;
              max-width: 80mm;
              margin: 0 auto;
              padding: 5mm;
              background: white;
              font-size: 12pt;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              background: #000;
              color: #fff;
              padding: 15px;
              margin-bottom: 15px;
              border-radius: 5px;
            }
            .header h1 {
              font-size: 18pt;
              font-weight: bold;
              letter-spacing: 2px;
              margin-bottom: 5px;
            }
            .header .icon { font-size: 24pt; }
            ${isAutoPrint ? `
            .auto-print-badge {
              text-align: center;
              background: #4CAF50;
              color: white;
              padding: 8px;
              margin-bottom: 10px;
              font-weight: bold;
              border-radius: 5px;
            }
            ` : `
            .manual-print-badge {
              text-align: center;
              background: #2196F3;
              color: white;
              padding: 8px;
              margin-bottom: 10px;
              font-weight: bold;
              border-radius: 5px;
            }
            `}
            ${autoStatusEnabled ? `
            .auto-workflow-badge {
              text-align: center;
              background: #FF9800;
              color: white;
              padding: 6px;
              margin-bottom: 10px;
              font-size: 10pt;
              border-radius: 5px;
            }
            ` : ''}
            .table-info {
              text-align: center;
              background: #000;
              color: #fff;
              padding: 20px 15px;
              margin: 15px 0;
              border-radius: 5px;
            }
            .table-number {
              font-size: 32pt;
              font-weight: bold;
              margin-bottom: 8px;
              letter-spacing: 1px;
            }
            .table-time { font-size: 11pt; opacity: 0.9; }
            .divider { border-top: 2px dashed #333; margin: 12px 0; }
            .divider-thick { border-top: 3px solid #000; margin: 15px 0; }
            .info-section {
              margin: 12px 0;
              padding: 10px;
              background: #f5f5f5;
              border-radius: 5px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 6px 0;
              font-size: 11pt;
            }
            .info-label { font-weight: bold; }
            .items-header {
              background: #000;
              color: #fff;
              padding: 10px;
              text-align: center;
              font-size: 14pt;
              font-weight: bold;
              margin: 15px 0 10px 0;
              letter-spacing: 1px;
            }
            .order-item {
              border: 2px solid #ddd;
              padding: 12px;
              margin: 10px 0;
              background: #fafafa;
              border-radius: 5px;
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              margin-bottom: 8px;
            }
            .item-name {
              font-size: 15pt;
              font-weight: bold;
              flex: 1;
              line-height: 1.3;
            }
            .item-price {
              font-size: 14pt;
              font-weight: bold;
              margin-left: 10px;
            }
            .item-details {
              display: flex;
              gap: 8px;
              flex-wrap: wrap;
              margin: 8px 0;
            }
            .detail-badge {
              background: #e0e0e0;
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 10pt;
              font-weight: 600;
            }
            .item-notes {
              margin-top: 10px;
              padding: 10px;
              background: #fff9c4;
              border-left: 4px solid #fbc02d;
              border-radius: 3px;
            }
            .note-line {
              margin: 4px 0;
              font-size: 10pt;
              line-height: 1.4;
            }
            .summary-section {
              margin: 15px 0;
              padding: 12px;
              background: #f0f0f0;
              border-radius: 5px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin: 6px 0;
              font-size: 12pt;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-top: 10px;
              padding-top: 10px;
              border-top: 2px solid #000;
              font-size: 16pt;
              font-weight: bold;
            }
            .footer { text-align: center; margin-top: 15px; }
            .priority-banner {
              background: #f44336;
              color: #fff;
              font-size: 14pt;
              font-weight: bold;
              padding: 15px;
              text-transform: uppercase;
              letter-spacing: 1px;
              border-radius: 5px;
            }
            .no-print { margin-top: 20px; text-align: center; }
            .no-print button {
              padding: 12px 24px;
              font-size: 14pt;
              margin: 5px;
              cursor: pointer;
              border: none;
              border-radius: 5px;
              background: #2196F3;
              color: white;
              font-weight: bold;
            }
            .no-print button:hover { background: #1976D2; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="icon">🍳</div>
            <h1>KITCHEN ORDER</h1>
          </div>

          ${isAutoPrint ? 
            '<div class="auto-print-badge">⚡ AUTO-PRINTED</div>' : 
            '<div class="manual-print-badge">👆 MANUAL PRINT</div>'
          }

          ${autoStatusEnabled ? 
            '<div class="auto-workflow-badge">🤖 AUTO-WORKFLOW ENABLED</div>' : 
            ''
          }
          
          <div class="table-info">
            <div class="table-number">TABLE ${group.tableNumber}</div>
            <div class="table-time">${new Date().toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}</div>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Restaurant:</span>
              <span>${restaurant?.name || 'Unknown'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Customer:</span>
              <span>${group.customerName}</span>
            </div>
            ${group.customerPhone ? `
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span>${group.customerPhone}</span>
              </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Total Items:</span>
              <span>${group.orders.length}</span>
            </div>
          </div>
          
          <div class="items-header">ORDER ITEMS</div>
          
          ${itemsHTML}
          
          <div class="divider-thick"></div>
          
          <div class="summary-section">
            <div class="summary-row">
              <span>Number of Items:</span>
              <span>${group.orders.length}</span>
            </div>
            <div class="summary-row">
              <span>Total Quantity:</span>
              <span>×${group.orders.reduce((sum, o) => sum + (o.quantity || 1), 0)}</span>
            </div>
            <div class="total-row">
              <span>TOTAL AMOUNT:</span>
              <span>₹${subtotal}</span>
            </div>
          </div>
          
          <div class="divider-thick"></div>
          
          <div class="footer">
            <div class="priority-banner">🔥 PREPARE IMMEDIATELY</div>
          </div>
          
          <div class="no-print">
            <button onclick="window.print()">🖨️ Print</button>
            <button onclick="window.close()">Close</button>
          </div>

          ${isAutoPrint ? `
          <script>
            setTimeout(() => { window.print(); }, 500);
          </script>
          ` : ''}
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

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

  // For non-admin users, always filter by their restaurant
  const effectiveRestaurantFilter = !isAdmin() && userRestaurantId
    ? userRestaurantId
    : selectedRestaurant;

  const filteredOrders = effectiveRestaurantFilter === 'all'
    ? orders
    : orders.filter(order => order.restaurantId === effectiveRestaurantFilter);

  const orderGroups = groupOrders(filteredOrders);

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
            <span className="back-icon"><FontAwesomeIcon icon={faArrowLeft} /></span>
            <span className="back-text">Back</span>
          </button>
          <div className="kds-title-section">
            <h1>Kitchen Display</h1>
            <p className="kds-subtitle">
              {autoStatusEnabled ? 'Fully automated workflow 🤖' : 'Active orders • Table grouped'}
            </p>
          </div>
        </div>

        <div className="kds-header-right">
          {/* AUTO-PRINT TOGGLE */}
          <div className="auto-print-toggle">
            <label className="toggle-label">
              <span className="toggle-text">Auto-Print:</span>
              <div className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={autoPrintEnabled}
                  onChange={(e) => setAutoPrintEnabled(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </div>
              <span className={`toggle-status ${autoPrintEnabled ? 'on' : 'off'}`}>
                {autoPrintEnabled ? '⚡ ON' : 'OFF'}
              </span>
            </label>
          </div>

          {/* AUTO-STATUS TOGGLE */}
          <div className="auto-status-toggle">
            <label className="toggle-label">
              <span className="toggle-text">Auto-Status:</span>
              <div className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={autoStatusEnabled}
                  onChange={(e) => setAutoStatusEnabled(e.target.checked)}
                  disabled={!autoPrintEnabled}
                />
                <span className="toggle-slider"></span>
              </div>
              <span className={`toggle-status ${autoStatusEnabled ? 'on' : 'off'}`}>
                {autoStatusEnabled ? '🤖 ON' : 'OFF'}
              </span>
            </label>
            {!autoPrintEnabled && (
              <span className="toggle-disabled-hint">Enable Auto-Print first</span>
            )}
          </div>

          {/* Restaurant filter - only show dropdown for admin users */}
          {isAdmin() ? (
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
          ) : (
            <div className="kds-restaurant-badge">
              {restaurants.find(r => (r.rest_id || r.restId) === userRestaurantId)?.name || 'Your Restaurant'}
            </div>
          )}

          <button
            className={`btn-auto-refresh ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          >
            <FontAwesomeIcon icon={autoRefresh ? faSync : faPause} />
            <span className="refresh-text">{autoRefresh ? 'Auto' : 'Manual'}</span>
          </button>

          <button className="btn-kds-refresh" onClick={fetchData}>
            <FontAwesomeIcon icon={faSync} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="kds-error">
          <FontAwesomeIcon icon={faExclamationTriangle} /> {error}
        </div>
      )}

      <div className="kds-stats">
        {groupedByStatus.map(status => (
          <div key={status.value} className="kds-stat-card" style={{ borderLeftColor: status.color }}>
            <span className="stat-icon"><FontAwesomeIcon icon={status.icon} /></span>
            <div className="stat-content">
              <span className="stat-value">{status.count}</span>
              <span className="stat-label">{status.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="kds-last-update">
        Last updated: {lastUpdate.toLocaleTimeString('en-IN')} • 
        Auto-print: {autoPrintEnabled ? ' ON ⚡' : ' OFF'} • 
        Auto-status: {autoStatusEnabled ? ' ON 🤖' : ' OFF'}
      </div>

      {autoStatusEnabled && (
        <div className="auto-status-info">
          <span>🤖 Automatic workflow:</span>
          <span>Confirmed → Preparing (2m)</span>
          <span>Preparing → Ready (15m)</span>
          <span>Ready → Served (5m)</span>
        </div>
      )}

      <div className="kds-content">
        {groupedByStatus.map(statusConfig => {
          if (statusConfig.groups.length === 0) return null;

          return (
            <div key={statusConfig.value} className="kds-status-section">
              <div className="kds-status-header" style={{ backgroundColor: statusConfig.bg }}>
                <span className="status-icon"><FontAwesomeIcon icon={statusConfig.icon} /></span>
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
                  const hasTimerWarning = group.orders.some(o => isWithinModificationWindow(o.createdAt));
                  const wasAutoPrinted = group.orders.every(o => autoPrintedOrders.has(o.orderId));

                  return (
                    <div key={group.key} className="kds-order-group-card">
                      <div
                        className="kds-group-header"
                        onClick={() => toggleGroup(group.key)}
                      >
                        <div className="group-table-number">
                          <span className="table-icon"><FontAwesomeIcon icon={faUtensils} /></span>
                          <span className="table-text">Table {group.tableNumber}</span>
                          {wasAutoPrinted && autoPrintEnabled && <span className="auto-printed-badge">⚡</span>}
                          {autoStatusEnabled && <span className="auto-status-badge">🤖</span>}
                        </div>

                        <div className="group-customer-info">
                          <div className="customer-name">
                            <span className="customer-icon"><FontAwesomeIcon icon={faUser} /></span>
                            <span>{group.customerName}</span>
                          </div>
                          {group.customerPhone && (
                            <div className="customer-phone">
                              <FontAwesomeIcon icon={faMobile} />
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
                            <FontAwesomeIcon icon={faClock} />
                            <span>{formatTime(earliestTime)}</span>
                          </div>
                        )}

                        <div className="group-expand-arrow">
                          <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} />
                        </div>
                      </div>

                      {hasTimerWarning && statusConfig.value === 'pending' && (
                        <div className="modification-timer-warning-group">
                          <FontAwesomeIcon icon={faHourglass} /> Customer modification timer active
                          {autoPrintEnabled ? ' - Auto-print will trigger when timer expires' : ' - Manual print available'}
                        </div>
                      )}

                      {isExpanded && (
                        <div className="group-actions">
                          <button
                            className="btn-print-table"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintTableOrder(group, false);
                            }}
                            title="Print entire table order (Manual)"
                          >
                            <FontAwesomeIcon icon={faPrint} /> Print Table Order {wasAutoPrinted && autoPrintEnabled && '(Reprint)'}
                          </button>
                        </div>
                      )}

                      {isExpanded && (
                        <div className="kds-group-orders">
                          {group.orders.map(order => {
                            const item = getItemDetails(order.productId);
                            const orderStatus = order.orderStatus || order.order_status || 'pending';
                            const currentStatusConfig = STATUS_CONFIG.find(s => s.value === orderStatus);
                            const withinModWindow = isWithinModificationWindow(order.createdAt);
                            const timeUntilNext = getTimeUntilNextStatus(order);

                            return (
                              <div 
                                key={order.orderId} 
                                className="kds-order-item"
                                style={{ borderLeftColor: currentStatusConfig?.color }}
                              >
                                <div className="order-item-header">
                                  <span
                                    className="order-time"
                                    style={{ color: getTimeColor(order.createdAt) }}
                                  >
                                    <FontAwesomeIcon icon={faClock} /> {formatTime(order.createdAt)}
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
                                          <span className="note-icon"><FontAwesomeIcon icon={faUtensils} /></span>
                                          <span className="note-text">{order.itemNotes}</span>
                                        </div>
                                      )}
                                      {order.orderNotes && (
                                        <div className="note-item">
                                          <span className="note-icon"><FontAwesomeIcon icon={faNoteSticky} /></span>
                                          <span className="note-text">{order.orderNotes}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {withinModWindow && statusConfig.value === 'pending' && (
                                  <div className="modification-timer-warning">
                                    <FontAwesomeIcon icon={faHourglass} /> Can modify for {2 - Math.floor((new Date() - new Date(order.createdAt)) / 60000)} more min
                                  </div>
                                )}

                                {/* AUTO-STATUS COUNTDOWN */}
                                {timeUntilNext && (
                                  <div className="auto-status-countdown">
                                    🤖 Auto-change to "{timeUntilNext.nextStatus}" in {timeUntilNext.minutes}m {timeUntilNext.seconds}s
                                  </div>
                                )}

                                <div className="kds-order-actions">
                                  {statusConfig.value === 'pending' && (
                                    <button
                                      className="btn-kds-action btn-confirm"
                                      onClick={() => handleStatusChange(order.orderId, 'confirmed')}
                                      disabled={withinModWindow}
                                      title={withinModWindow ? 'Wait for customer modification timer' : 'Manually confirm order'}
                                      style={withinModWindow ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                    >
                                      {withinModWindow ? <><FontAwesomeIcon icon={faHourglass} /> Wait</> : <><FontAwesomeIcon icon={faCheck} /> Confirm</>}
                                    </button>
                                  )}

                                  {statusConfig.value === 'confirmed' && (
                                    <button
                                      className="btn-kds-action btn-start"
                                      onClick={() => handleStatusChange(order.orderId, 'preparing')}
                                    >
                                      <FontAwesomeIcon icon={faKitchenSet} /> Start
                                    </button>
                                  )}

                                  {statusConfig.value === 'preparing' && (
                                    <button
                                      className="btn-kds-action btn-ready"
                                      onClick={() => handleStatusChange(order.orderId, 'ready')}
                                    >
                                      <FontAwesomeIcon icon={faCheck} /> Ready
                                    </button>
                                  )}

                                  {statusConfig.value === 'ready' && (
                                    <button
                                      className="btn-kds-action btn-served"
                                      onClick={() => handleMarkServed(order.orderId)}
                                    >
                                      <FontAwesomeIcon icon={faUtensils} /> Served
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
          <span className="empty-icon"><FontAwesomeIcon icon={faUtensils} size="2x" /></span>
          <h3>No Active Orders</h3>
          <p>New orders will appear here automatically</p>
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;
