import React, { useState, useEffect, useRef } from 'react';
import KitchenPrintReceipt from './KitchenPrintReceipt';
import InvoiceLinkGenerator from './InvoiceLinkGenerator';
import './OrderConfirmationTimer.css';
import './KitchenPrintReceipt.css';

const OrderConfirmationTimer = ({ order, restaurant, item, onModify, onCancel, onConfirm }) => {
  const [timeLeft, setTimeLeft] = useState(120); // 120 seconds = 2 minutes
  const [isPrinting, setIsPrinting] = useState(false);
  const [printOrder, setPrintOrder] = useState(null);
  const [showInvoiceLink, setShowInvoiceLink] = useState(false);
  const timerRef = useRef(null);
  const hasTriggeredPrint = useRef(false);

  useEffect(() => {
    // Start countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Timer expired - trigger kitchen print
          if (!hasTriggeredPrint.current) {
            handleAutoConfirm();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleAutoConfirm = () => {
    if (hasTriggeredPrint.current) return;
    
    hasTriggeredPrint.current = true;
    setIsPrinting(true);

    // Trigger kitchen print
    setPrintOrder({ order, restaurant, item });
    
    setTimeout(() => {
      window.print();
      setPrintOrder(null);
      setIsPrinting(false);
      
      // Show invoice link after print
      setShowInvoiceLink(true);
      
      // Notify parent component
      if (onConfirm) {
        onConfirm(order);
      }
    }, 300);
  };

  const handleManualConfirm = () => {
    if (hasTriggeredPrint.current) return;
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Immediately confirm and print
    handleAutoConfirm();
  };

  const handleModifyOrder = () => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Notify parent to show modification UI
    if (onModify) {
      onModify(order);
    }
  };

  const handleCancelOrder = () => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Notify parent to cancel order
    if (onCancel) {
      onCancel(order);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((120 - timeLeft) / 120) * 100;
  };

  const getStatusColor = () => {
    if (timeLeft > 90) return '#22c55e'; // Green
    if (timeLeft > 60) return '#3b82f6'; // Blue
    if (timeLeft > 30) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <div className="order-timer-overlay">
      <div className="order-timer-container">
        {/* Header */}
        <div className="timer-header">
          <div className="timer-icon">✅</div>
          <h2>Order Placed Successfully!</h2>
          <p className="timer-subtitle">
            Order #{order.orderId} | Table {order.tableNumber}
          </p>
        </div>

        {/* Countdown Display */}
        <div className="timer-display">
          <div className="timer-circle" style={{ borderColor: getStatusColor() }}>
            <div className="timer-time" style={{ color: getStatusColor() }}>
              {formatTime(timeLeft)}
            </div>
            <div className="timer-label">Time to Modify</div>
          </div>
          
          {/* Progress Ring */}
          <svg className="timer-progress-ring" width="200" height="200">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke={getStatusColor()}
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - getProgressPercentage() / 100)}`}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
        </div>

        {/* Order Summary */}
        <div className="timer-order-summary">
          <h3>Order Details:</h3>
          <div className="summary-item">
            <span className="summary-label">Item:</span>
            <span className="summary-value">{item?.productName || 'Unknown'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Quantity:</span>
            <span className="summary-value">×{order.quantity || 1}</span>
          </div>
          {order.portionSize && (
            <div className="summary-item">
              <span className="summary-label">Size:</span>
              <span className="summary-value">{order.portionSize}</span>
            </div>
          )}
          <div className="summary-item">
            <span className="summary-label">Price:</span>
            <span className="summary-value">₹{order.price || 0}</span>
          </div>
        </div>

        {/* Status Message */}
        <div className="timer-status">
          {timeLeft > 0 ? (
            <>
              <div className="status-icon">⏰</div>
              <p className="status-message">
                Kitchen will be notified automatically in <strong>{formatTime(timeLeft)}</strong>
              </p>
              <p className="status-hint">
                You can modify or cancel your order during this time
              </p>
            </>
          ) : (
            <>
              <div className="status-icon">🖨️</div>
              <p className="status-message">
                Sending order to kitchen...
              </p>
            </>
          )}
        </div>

        {/* Action Buttons */}
        {timeLeft > 0 && !isPrinting && (
          <div className="timer-actions">
            <button 
              className="btn-timer btn-confirm"
              onClick={handleManualConfirm}
            >
              ✓ Confirm Now
            </button>
            
            <button 
              className="btn-timer btn-modify"
              onClick={handleModifyOrder}
            >
              ✏️ Modify Order
            </button>
            
            <button 
              className="btn-timer btn-cancel"
              onClick={handleCancelOrder}
            >
              ✕ Cancel Order
            </button>
          </div>
        )}

        {isPrinting && (
          <div className="printing-status">
            <div className="printing-spinner"></div>
            <p>Sending to kitchen...</p>
          </div>
        )}
      </div>

      {/* Hidden Kitchen Print Receipt */}
      {printOrder && (
        <KitchenPrintReceipt
          order={printOrder.order}
          restaurant={printOrder.restaurant}
          item={printOrder.item}
        />
      )}

      {/* Invoice Link Modal */}
      {showInvoiceLink && (
        <InvoiceLinkGenerator
          orderId={order.orderId}
          onClose={() => setShowInvoiceLink(false)}
        />
      )}
    </div>
  );
};

export default OrderConfirmationTimer;
