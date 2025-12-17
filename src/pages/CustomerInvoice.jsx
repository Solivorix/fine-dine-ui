import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { orderAPI, restaurantAPI, itemAPI } from '../services/api';
import './CustomerInvoice.css';

const CustomerInvoice = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInvoiceData();
  }, [orderId]);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      
      // Fetch order details
      const orderRes = await orderAPI.getAll();
      const orderData = (orderRes.data || []).find(o => o.orderId === parseInt(orderId));
      
      if (!orderData) {
        setError('Invoice not found');
        setLoading(false);
        return;
      }
      
      setOrder(orderData);

      // Fetch restaurant and item details
      const [restaurantsRes, itemsRes] = await Promise.all([
        restaurantAPI.getAll(),
        itemAPI.getAll()
      ]);

      const restaurantData = (restaurantsRes.data || []).find(
        r => (r.rest_id || r.restId) === orderData.restaurantId
      );
      const itemData = (itemsRes.data || []).find(
        i => (i.itemId || i.productId) === orderData.productId
      );

      setRestaurant(restaurantData);
      setItem(itemData);
      setError(null);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusLabel = (status) => {
    const statusMap = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'preparing': 'Preparing',
      'ready': 'Ready',
      'served': 'Served',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || 'Pending';
  };

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="invoice-container">
        <div className="invoice-loading">
          <div className="loading-spinner"></div>
          <p>Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="invoice-container">
        <div className="invoice-error">
          <span className="error-icon">⚠️</span>
          <h2>{error || 'Invoice not found'}</h2>
          <p>Please check the invoice link and try again.</p>
        </div>
      </div>
    );
  }

  const subtotal = (order.price || 0) * (order.quantity || 1);
  const tax = subtotal * 0.05; // 5% tax (adjust as needed)
  const total = subtotal + tax;

  return (
    <div className="invoice-container">
      {/* Action Buttons - Hidden on print */}
      <div className="invoice-actions no-print">
        <button className="btn-download" onClick={handleDownload}>
          📥 Download / Print
        </button>
      </div>

      {/* Invoice Content */}
      <div className="invoice-content">
        {/* Header */}
        <div className="invoice-header">
          <div className="restaurant-info">
            <h1>{restaurant?.name || 'Restaurant'}</h1>
            {restaurant?.address && <p>{restaurant.address}</p>}
            {restaurant?.phone && <p>Phone: {restaurant.phone}</p>}
            {restaurant?.email && <p>Email: {restaurant.email}</p>}
          </div>
          <div className="invoice-badge">
            <div className="badge-title">INVOICE</div>
            <div className="badge-number">#{order.orderId}</div>
          </div>
        </div>

        <div className="invoice-divider"></div>

        {/* Invoice Details */}
        <div className="invoice-details-section">
          <div className="details-left">
            <h3>Bill To:</h3>
            <p className="customer-name">{order.createdBy || 'Guest'}</p>
            {order.customerPhone && <p>Phone: {order.customerPhone}</p>}
            <p>Table: {order.tableNumber}</p>
          </div>
          <div className="details-right">
            <div className="detail-row">
              <span className="detail-label">Invoice Date:</span>
              <span className="detail-value">{formatDate(order.createdAt)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className={`status-badge status-${order.orderStatus || 'pending'}`}>
                {getStatusLabel(order.orderStatus)}
              </span>
            </div>
          </div>
        </div>

        <div className="invoice-divider"></div>

        {/* Items Table */}
        <table className="invoice-table">
          <thead>
            <tr>
              <th className="text-left">Item Description</th>
              <th className="text-center">Quantity</th>
              <th className="text-right">Unit Price</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="item-description">
                  <div className="item-name">{item?.productName || 'Unknown Item'}</div>
                  {order.portionSize && (
                    <div className="item-meta">Portion: {order.portionSize}</div>
                  )}
                  {order.itemNotes && (
                    <div className="item-meta">Note: {order.itemNotes}</div>
                  )}
                </div>
              </td>
              <td className="text-center">{order.quantity || 1}</td>
              <td className="text-right">₹{(order.price || 0).toFixed(2)}</td>
              <td className="text-right">₹{subtotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Order Notes */}
        {order.orderNotes && (
          <div className="invoice-notes">
            <strong>Order Notes:</strong> {order.orderNotes}
          </div>
        )}

        <div className="invoice-divider"></div>

        {/* Totals */}
        <div className="invoice-totals">
          <div className="total-row">
            <span className="total-label">Subtotal:</span>
            <span className="total-value">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="total-row">
            <span className="total-label">Tax (5%):</span>
            <span className="total-value">₹{tax.toFixed(2)}</span>
          </div>
          <div className="total-row total-final">
            <span className="total-label">Total Amount:</span>
            <span className="total-value">₹{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="invoice-divider"></div>

        {/* Footer */}
        <div className="invoice-footer">
          <p className="footer-text">Thank you for your business!</p>
          <p className="footer-note">This is a digital invoice. No signature required.</p>
          <p className="footer-note">Invoice generated on: {new Date().toLocaleString('en-IN')}</p>
        </div>

        {/* QR Code Placeholder */}
        <div className="invoice-qr">
          <p className="qr-text">🔗 Share this invoice: {window.location.href}</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerInvoice;
