import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import './InvoiceLinkGenerator.css';

const InvoiceLinkGenerator = ({ orderId, onClose }) => {
  const qrCanvasRef = useRef(null);
  const invoiceUrl = `${window.location.origin}/invoice/${orderId}`;

  useEffect(() => {
    // Generate QR Code
    if (qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, invoiceUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1a1a2e',
          light: '#ffffff'
        }
      });
    }
  }, [invoiceUrl]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(invoiceUrl);
    alert('Invoice link copied to clipboard!');
  };

  const sendViaSMS = () => {
    const smsBody = `Your order invoice is ready! View it here: ${invoiceUrl}`;
    window.open(`sms:?body=${encodeURIComponent(smsBody)}`);
  };

  const sendViaWhatsApp = () => {
    const message = `Your order invoice (#${orderId}) is ready! View and download it here: ${invoiceUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  const sendViaEmail = () => {
    const subject = `Your Order Invoice #${orderId}`;
    const body = `Thank you for your order!\n\nYour digital invoice is ready. View and download it here:\n${invoiceUrl}\n\nBest regards`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <div className="invoice-link-modal-overlay">
      <div className="invoice-link-modal">
        <div className="modal-header">
          <h2>📄 Digital Invoice Ready</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          <p className="modal-description">
            ♻️ Going paperless! Share this digital invoice with your customer.
          </p>

          {/* QR Code */}
          <div className="qr-section">
            <h3>Scan QR Code</h3>
            <div className="qr-container">
              <canvas ref={qrCanvasRef}></canvas>
            </div>
            <p className="qr-instruction">Customer can scan this with their phone</p>
          </div>

          {/* Invoice Link */}
          <div className="link-section">
            <h3>Or Share Link</h3>
            <div className="link-display">
              <input 
                type="text" 
                value={invoiceUrl} 
                readOnly 
                className="link-input"
              />
              <button className="btn-copy" onClick={copyToClipboard}>
                📋 Copy
              </button>
            </div>
          </div>

          {/* Share Options */}
          <div className="share-section">
            <h3>Quick Share</h3>
            <div className="share-buttons">
              <button className="btn-share btn-sms" onClick={sendViaSMS}>
                💬 SMS
              </button>
              <button className="btn-share btn-whatsapp" onClick={sendViaWhatsApp}>
                📱 WhatsApp
              </button>
              <button className="btn-share btn-email" onClick={sendViaEmail}>
                📧 Email
              </button>
            </div>
          </div>

          {/* Order Info */}
          <div className="order-info-box">
            <div className="info-item">
              <span className="info-label">Order ID:</span>
              <span className="info-value">#{orderId}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Invoice Link:</span>
              <span className="info-value-small">/invoice/{orderId}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceLinkGenerator;
