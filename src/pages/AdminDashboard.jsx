import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { itemAPI, orderAPI } from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalItems: 0,
    activeOrders: 0,
    todayOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, ordersRes] = await Promise.all([
        itemAPI.getAll(),
        orderAPI.getAll()
      ]);
      
      setStats({
        totalItems: itemsRes.data.length,
        activeOrders: ordersRes.data.length,
        todayOrders: ordersRes.data.filter(order => {
          const orderDate = new Date(order.createdAt);
          const today = new Date();
          return orderDate.toDateString() === today.toDateString();
        }).length,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setStats({
        totalItems: 0,
        activeOrders: 0,
        todayOrders: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="container">
          <div className="header-content">
            <div className="logo-section">
              <h1>🍽️ Restaurant Admin</h1>
              <p>Welcome back, {user?.loginId || 'Admin'}</p>
            </div>
            <button className="btn btn-outline" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-main">
        <div className="container">
          {/* Stats Cards */}
          <div className="stats-grid fade-in">
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)' }}>
                📋
              </div>
              <div className="stat-content">
                <h3>{stats.totalItems}</h3>
                <p>Menu Items</p>
              </div>
            </div>

            <div className="stat-card card" style={{ animationDelay: '0.1s' }}>
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)' }}>
                🛎️
              </div>
              <div className="stat-content">
                <h3>{stats.activeOrders}</h3>
                <p>Total Orders</p>
              </div>
            </div>

            <div className="stat-card card" style={{ animationDelay: '0.2s' }}>
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #2d7a3e 0%, #27ae60 100%)' }}>
                ✅
              </div>
              <div className="stat-content">
                <h3>{stats.todayOrders}</h3>
                <p>Today's Orders</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions fade-in" style={{ animationDelay: '0.3s' }}>
            <h2>Quick Actions</h2>
            <div className="action-grid">
              <Link to="/admin/restaurants" className="action-card card card-elevated">
                <div className="action-icon">🏪</div>
                <h3>Manage Restaurants</h3>
                <p>Add and configure restaurant locations</p>
              </Link>

              <Link to="/admin/menu" className="action-card card card-elevated">
                <div className="action-icon">📋</div>
                <h3>Manage Menu</h3>
                <p>Add, edit items and set prices</p>
              </Link>

              <Link to="/admin/orders" className="action-card card card-elevated">
                <div className="action-icon">🛎️</div>
                <h3>View Orders</h3>
                <p>Track and manage customer orders</p>
              </Link>

              <Link to="/admin/users" className="action-card card card-elevated">
                <div className="action-icon">👥</div>
                <h3>Manage Users</h3>
                <p>Add staff and manage accounts</p>
              </Link>

              <a 
                href="/table/1" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="action-card card card-elevated"
              >
                <div className="action-icon">📱</div>
                <h3>Preview Menu</h3>
                <p>See customer view (Table 1)</p>
              </a>
            </div>
          </div>

          {/* Instructions Section */}
          <div className="instructions-section fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="section-header">
              <h2>How It Works</h2>
            </div>

            <div className="instructions-grid">
              <div className="instruction-card card">
                <div className="instruction-number">1</div>
                <h3>Add Menu Items</h3>
                <p>Go to "Manage Menu" to add your dishes with descriptions and prices</p>
              </div>

              <div className="instruction-card card">
                <div className="instruction-number">2</div>
                <h3>Generate QR Codes</h3>
                <p>Create QR codes for each table pointing to: <br/>
                <code>/table/1</code>, <code>/table/2</code>, etc.</p>
              </div>

              <div className="instruction-card card">
                <div className="instruction-number">3</div>
                <h3>Customers Order</h3>
                <p>Customers scan QR, enter mobile number, browse menu and order directly</p>
              </div>

              <div className="instruction-card card">
                <div className="instruction-number">4</div>
                <h3>Track Orders</h3>
                <p>View all orders in real-time from the "View Orders" section</p>
              </div>
            </div>
          </div>

          {/* QR Code Info */}
          <div className="qr-info-section fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="card" style={{ padding: 'var(--spacing-2xl)', textAlign: 'center' }}>
              <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>📱 Generate QR Codes for Tables</h2>
              <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-light)' }}>
                Create QR codes pointing to these URLs for each table:
              </p>
              <div style={{ background: 'var(--bg)', padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-lg)' }}>
                <code style={{ fontSize: '1.1rem', color: 'var(--accent-dark)' }}>
                  {window.location.origin}/table/1<br/>
                  {window.location.origin}/table/2<br/>
                  {window.location.origin}/table/3<br/>
                  ... and so on
                </code>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Use any free QR code generator like <a href="https://www.qr-code-generator.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>qr-code-generator.com</a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
