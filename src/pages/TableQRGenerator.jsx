import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { restaurantAPI } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faQrcode, faStore, faChair, faPrint, faSync,
  faPlus, faMinus, faDownload, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import './TableQRGenerator.css';

const TableQRGenerator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const printRef = useRef();

  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [tableCount, setTableCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [qrSize, setQrSize] = useState(200);

  const BASE_URL = window.location.origin;

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await restaurantAPI.getAll();
      setRestaurants(response.data || []);
      if (response.data?.length > 0) {
        const firstRest = response.data[0];
        setSelectedRestaurant(firstRest.rest_id || firstRest.restId);
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRestaurantName = () => {
    const rest = restaurants.find(r => (r.rest_id || r.restId) === selectedRestaurant);
    return rest?.name || 'Restaurant';
  };

  const generateTableUrl = (tableNumber) => {
    return `${BASE_URL}/order/${selectedRestaurant}/${tableNumber}`;
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Table QR Codes - ${getRestaurantName()}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .print-header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #333;
            }
            .print-header h1 {
              font-size: 24px;
              margin-bottom: 5px;
            }
            .print-header p {
              color: #666;
              font-size: 14px;
            }
            .qr-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 30px;
              page-break-inside: auto;
            }
            .qr-card {
              border: 2px solid #333;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              page-break-inside: avoid;
              background: #fff;
            }
            .qr-card h3 {
              font-size: 18px;
              margin-bottom: 15px;
              color: #333;
            }
            .qr-card svg {
              display: block;
              margin: 0 auto 15px;
            }
            .qr-card .table-number {
              font-size: 32px;
              font-weight: bold;
              color: #d97706;
              margin-bottom: 5px;
            }
            .qr-card .scan-text {
              font-size: 12px;
              color: #666;
            }
            .qr-card .restaurant-name {
              font-size: 14px;
              color: #333;
              margin-top: 10px;
              font-weight: 500;
            }
            @media print {
              body {
                padding: 10px;
              }
              .qr-grid {
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
              }
              .qr-card {
                padding: 15px;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${getRestaurantName()}</h1>
            <p>Table QR Codes for Customer Ordering</p>
          </div>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for images/SVGs to load
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleDownloadAll = () => {
    // Create a temporary container for all QR codes
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    for (let i = 1; i <= tableCount; i++) {
      const canvas = document.createElement('canvas');
      const svg = document.querySelector(`#qr-table-${i} svg`);
      if (!svg) continue;

      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      img.onload = () => {
        canvas.width = qrSize;
        canvas.height = qrSize;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, qrSize, qrSize);
        ctx.drawImage(img, 0, 0);

        const link = document.createElement('a');
        link.download = `table-${i}-qr.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }

    document.body.removeChild(container);
  };

  // Check admin access
  if (user?.role?.toUpperCase() !== 'ADMIN') {
    return (
      <div className="qr-access-denied">
        <FontAwesomeIcon icon={faExclamationTriangle} size="3x" />
        <h2>Access Denied</h2>
        <p>Only administrators can access the QR code generator.</p>
        <button onClick={() => navigate('/admin')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="qr-loading">
        <div className="qr-loader"></div>
        <p>Loading restaurants...</p>
      </div>
    );
  }

  return (
    <div className="qr-generator-container">
      {/* Header */}
      <header className="qr-header">
        <div className="qr-header-left">
          <button className="qr-back-btn" onClick={() => navigate('/admin')}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back</span>
          </button>
          <div className="qr-title-section">
            <h1><FontAwesomeIcon icon={faQrcode} /> Table QR Generator</h1>
            <p>Generate QR codes for table ordering</p>
          </div>
        </div>
        <div className="qr-header-actions">
          <button className="qr-btn-secondary" onClick={fetchRestaurants}>
            <FontAwesomeIcon icon={faSync} />
          </button>
          <button className="qr-btn-primary" onClick={handlePrint}>
            <FontAwesomeIcon icon={faPrint} /> Print All
          </button>
        </div>
      </header>

      {/* Controls */}
      <div className="qr-controls">
        <div className="qr-control-group">
          <label><FontAwesomeIcon icon={faStore} /> Restaurant</label>
          <select
            value={selectedRestaurant}
            onChange={(e) => setSelectedRestaurant(e.target.value)}
          >
            {restaurants.map(r => (
              <option key={r.rest_id || r.restId} value={r.rest_id || r.restId}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="qr-control-group">
          <label><FontAwesomeIcon icon={faChair} /> Number of Tables</label>
          <div className="qr-number-input">
            <button
              onClick={() => setTableCount(Math.max(1, tableCount - 1))}
              disabled={tableCount <= 1}
            >
              <FontAwesomeIcon icon={faMinus} />
            </button>
            <input
              type="number"
              value={tableCount}
              onChange={(e) => setTableCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              min="1"
              max="100"
            />
            <button
              onClick={() => setTableCount(Math.min(100, tableCount + 1))}
              disabled={tableCount >= 100}
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
        </div>

        <div className="qr-control-group">
          <label><FontAwesomeIcon icon={faQrcode} /> QR Size</label>
          <select value={qrSize} onChange={(e) => setQrSize(parseInt(e.target.value))}>
            <option value="150">Small (150px)</option>
            <option value="200">Medium (200px)</option>
            <option value="250">Large (250px)</option>
            <option value="300">Extra Large (300px)</option>
          </select>
        </div>
      </div>

      {/* Info Banner */}
      <div className="qr-info-banner">
        <p>
          <strong>How it works:</strong> Each QR code links to <code>/order/{selectedRestaurant}/[table]</code>.
          Customers scan the QR code to view the menu and place orders directly from their table.
        </p>
      </div>

      {/* QR Codes Grid */}
      <div className="qr-grid" ref={printRef}>
        {Array.from({ length: tableCount }, (_, i) => i + 1).map(tableNumber => (
          <div key={tableNumber} className="qr-card" id={`qr-table-${tableNumber}`}>
            <h3>{getRestaurantName()}</h3>
            <QRCodeSVG
              value={generateTableUrl(tableNumber)}
              size={qrSize}
              level="H"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#000000"
            />
            <div className="qr-card-info">
              <span className="table-label">Table</span>
              <span className="table-number">{tableNumber}</span>
              <span className="scan-text">Scan to order</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="qr-footer-actions">
        <button className="qr-btn-outline" onClick={handleDownloadAll}>
          <FontAwesomeIcon icon={faDownload} /> Download All as PNG
        </button>
        <button className="qr-btn-primary" onClick={handlePrint}>
          <FontAwesomeIcon icon={faPrint} /> Print QR Codes
        </button>
      </div>
    </div>
  );
};

export default TableQRGenerator;
