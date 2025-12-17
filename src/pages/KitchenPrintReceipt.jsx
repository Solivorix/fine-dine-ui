import React from 'react';
import './KitchenPrintReceipt.css';

const KitchenPrintReceipt = ({ order, restaurant, item }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="kitchen-print-receipt">
      {/* Header */}
      <div className="kitchen-header">
        <h1>🍳 KITCHEN ORDER</h1>
        <div className="order-id-large">Order #{order.orderId}</div>
      </div>

      <div className="print-divider"></div>

      {/* Critical Info - Large Text */}
      <div className="critical-section">
        <div className="table-info-large">
          <span className="label">TABLE:</span>
          <span className="value">#{order.tableNumber}</span>
        </div>
        
        <div className="time-info">
          <span>{formatDate(order.createdAt)}</span>
        </div>
      </div>

      <div className="print-divider"></div>

      {/* Restaurant */}
      <div className="info-row">
        <span className="label">Restaurant:</span>
        <span className="value">{restaurant?.name || 'Unknown'}</span>
      </div>

      {/* Customer Info */}
      <div className="info-row">
        <span className="label">Customer:</span>
        <span className="value">{order.createdBy || 'Guest'}</span>
      </div>
      
      {order.customerPhone && (
        <div className="info-row">
          <span className="label">Phone:</span>
          <span className="value">{order.customerPhone}</span>
        </div>
      )}

      <div className="print-divider-thick"></div>

      {/* Item Details - Large & Bold */}
      <div className="item-section">
        <h2>ORDER ITEM:</h2>
        
        <div className="item-main-info">
          <div className="item-name-large">
            {item?.productName || 'Unknown Item'}
          </div>
          
          <div className="item-details-row">
            <div className="quantity-large">
              Quantity: <strong>×{order.quantity || 1}</strong>
            </div>
            
            {order.portionSize && (
              <div className="portion-large">
                Size: <strong>{order.portionSize.toUpperCase()}</strong>
              </div>
            )}
          </div>

          <div className="price-info">
            <span>Unit Price: ₹{order.price || 0}</span>
            <span className="total-price">
              TOTAL: ₹{(order.price || 0) * (order.quantity || 1)}
            </span>
          </div>
        </div>
      </div>

      {/* Special Instructions - Highlighted */}
      {(order.orderNotes || order.itemNotes) && (
        <>
          <div className="print-divider-thick"></div>
          <div className="notes-section">
            <h2>⚠️ SPECIAL INSTRUCTIONS:</h2>
            
            {order.itemNotes && (
              <div className="note-box">
                <div className="note-label">🍴 Item Notes:</div>
                <div className="note-content">{order.itemNotes}</div>
              </div>
            )}
            
            {order.orderNotes && (
              <div className="note-box">
                <div className="note-label">📝 Order Notes:</div>
                <div className="note-content">{order.orderNotes}</div>
              </div>
            )}
          </div>
        </>
      )}

      <div className="print-divider-thick"></div>

      {/* Footer */}
      <div className="kitchen-footer">
        <div className="priority-badge">
          🔥 PREPARE IMMEDIATELY
        </div>
      </div>
    </div>
  );
};

export default KitchenPrintReceipt;
