import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { restaurantAPI, itemAPI, userAPI } from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    totalMenuItems: 0,
    totalUsers: 0,
    availableItems: 0
  });
  const [recentRestaurants, setRecentRestaurants] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [restaurantsRes, itemsRes, usersRes] = await Promise.all([
        restaurantAPI.getAll(),
        itemAPI.getAll(),
        userAPI.getAll()
      ]);

      const restaurants = restaurantsRes.data || [];
      const items = itemsRes.data || [];
      const users = usersRes.data || [];

      const availableItems = items.filter(i => 
        (i.item_status || i.itemStatus) === 'available'
      ).length;

      setStats({
        totalRestaurants: restaurants.length,
        totalMenuItems: items.length,
        totalUsers: users.length,
        availableItems
      });

      setRecentRestaurants(restaurants.slice(0, 5));
      setRecentItems(items.slice(0, 6));

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'starter': '🥗',
      'main': '🍽️',
      'dessert': '🍰',
      'beverage': '🥤',
      'appetizer': '🍤',
      'soup': '🍲',
      'salad': '🥬'
    };
    return icons[category] || '🍴';
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🍽️</span>
            <span className="logo-text">FineDine</span>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-section">
            <span className="nav-section-title">Main Menu</span>
            <Link to="/admin" className="nav-item active">
              <span className="nav-icon">📊</span>
              <span>Dashboard</span>
            </Link>
            <Link to="/admin/restaurants" className="nav-item">
              <span className="nav-icon">🏪</span>
              <span>Restaurants</span>
            </Link>
            <Link to="/admin/menu" className="nav-item">
              <span className="nav-icon">🍽️</span>
              <span>Menu Items</span>
            </Link>
            <Link to="/admin/users" className="nav-item">
              <span className="nav-icon">👥</span>
              <span>Users</span>
            </Link>
          </div>
          
          <div className="nav-section">
            <span className="nav-section-title">Operations</span>
            <Link to="/admin/orders" className="nav-item">
              <span className="nav-icon">📋</span>
              <span>Orders</span>
            </Link>
            <Link to="/admin/kitchen" className="nav-item">
              <span className="nav-icon">👨‍🍳</span>
              <span>Kitchen</span>
            </Link>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user?.loginId?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.loginId || 'Admin'}</span>
              <span className="user-role">{user?.role || 'Administrator'}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={logout}>
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="header-welcome">
            <h1>{getGreeting()}, {user?.loginId || 'Admin'}! 👋</h1>
            <p className="header-date">{formatDate()}</p>
          </div>
          <div className="header-actions">
            <button className="btn-refresh" onClick={fetchDashboardData}>
              <span>🔄</span>
              Refresh
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="stats-grid">
          <div className="stat-card stat-restaurants">
            <div className="stat-card-content">
              <div className="stat-card-info">
                <span className="stat-card-value">{stats.totalRestaurants}</span>
                <span className="stat-card-label">Total Restaurants</span>
              </div>
              <div className="stat-card-icon">
                <span>🏪</span>
              </div>
            </div>
            <div className="stat-card-footer">
              <span className="stat-trend positive">Active locations</span>
            </div>
          </div>

          <div className="stat-card stat-menu">
            <div className="stat-card-content">
              <div className="stat-card-info">
                <span className="stat-card-value">{stats.totalMenuItems}</span>
                <span className="stat-card-label">Menu Items</span>
              </div>
              <div className="stat-card-icon">
                <span>🍽️</span>
              </div>
            </div>
            <div className="stat-card-footer">
              <span className="stat-trend positive">{stats.availableItems} available</span>
            </div>
          </div>

          <div className="stat-card stat-users">
            <div className="stat-card-content">
              <div className="stat-card-info">
                <span className="stat-card-value">{stats.totalUsers}</span>
                <span className="stat-card-label">Total Users</span>
              </div>
              <div className="stat-card-icon">
                <span>👥</span>
              </div>
            </div>
            <div className="stat-card-footer">
              <span className="stat-trend positive">Staff members</span>
            </div>
          </div>

          <div className="stat-card stat-orders">
            <div className="stat-card-content">
              <div className="stat-card-info">
                <span className="stat-card-value">--</span>
                <span className="stat-card-label">Today's Orders</span>
              </div>
              <div className="stat-card-icon">
                <span>📋</span>
              </div>
            </div>
            <div className="stat-card-footer">
              <span className="stat-trend">View orders</span>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="quick-actions-section">
          <div className="section-header">
            <h2>Quick Actions</h2>
            <p>Navigate to frequently used sections</p>
          </div>
          <div className="quick-actions-grid">
            <Link to="/admin/restaurants" className="quick-action-card">
              <div className="quick-action-icon gold">
                <span>🏪</span>
              </div>
              <div className="quick-action-info">
                <span className="quick-action-title">Restaurants</span>
                <span className="quick-action-subtitle">Manage locations</span>
              </div>
              <div className="quick-action-arrow">→</div>
            </Link>

            <Link to="/admin/menu" className="quick-action-card">
              <div className="quick-action-icon green">
                <span>🍽️</span>
              </div>
              <div className="quick-action-info">
                <span className="quick-action-title">Menu Items</span>
                <span className="quick-action-subtitle">Manage dishes</span>
              </div>
              <div className="quick-action-arrow">→</div>
            </Link>

            <Link to="/admin/kitchen" className="quick-action-card">
              <div className="quick-action-icon purple">
                <span>👨‍🍳</span>
              </div>
              <div className="quick-action-info">
                <span className="quick-action-title">Kitchen Display</span>
                <span className="quick-action-subtitle">View live orders</span>
              </div>
              <div className="quick-action-arrow">→</div>
            </Link>

            <Link to="/admin/orders" className="quick-action-card">
              <div className="quick-action-icon orange">
                <span>📋</span>
              </div>
              <div className="quick-action-info">
                <span className="quick-action-title">Orders</span>
                <span className="quick-action-subtitle">View orders</span>
              </div>
              <div className="quick-action-arrow">→</div>
            </Link>
          </div>
        </section>

        {/* Content Grid */}
        <div className="dashboard-content-grid">
          {/* Recent Restaurants */}
          <section className="dashboard-card recent-restaurants">
            <div className="card-header">
              <h3>
                <span className="card-header-icon">🏪</span>
                Recent Restaurants
              </h3>
              <Link to="/admin/restaurants" className="btn-view-all">
                View All →
              </Link>
            </div>
            <div className="card-content">
              {recentRestaurants.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">🏪</span>
                  <p>No restaurants yet</p>
                  <Link to="/admin/restaurants" className="btn-add-new">
                    Add Restaurant
                  </Link>
                </div>
              ) : (
                <div className="restaurant-list">
                  {recentRestaurants.map((restaurant, index) => {
                    const id = restaurant.rest_id || restaurant.restId;
                    return (
                      <div key={id || index} className="restaurant-list-item">
                        <div className="restaurant-avatar">
                          {restaurant.name?.charAt(0)?.toUpperCase() || 'R'}
                        </div>
                        <div className="restaurant-info">
                          <span className="restaurant-name">{restaurant.name}</span>
                          <span className="restaurant-address">
                            {restaurant.address || 'No address'}
                          </span>
                        </div>
                        <div className="restaurant-contact">
                          {restaurant.primaryContactNumber || '--'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Recent Menu Items */}
          <section className="dashboard-card recent-items">
            <div className="card-header">
              <h3>
                <span className="card-header-icon">🍽️</span>
                Recent Menu Items
              </h3>
              <Link to="/admin/menu" className="btn-view-all">
                View All →
              </Link>
            </div>
            <div className="card-content">
              {recentItems.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">🍽️</span>
                  <p>No menu items yet</p>
                  <Link to="/admin/menu" className="btn-add-new">
                    Add Menu Item
                  </Link>
                </div>
              ) : (
                <div className="items-grid-small">
                  {recentItems.map((item, index) => {
                    const id = item.item_id || item.itemId;
                    const name = item.product_name || item.productName;
                    const status = item.item_status || item.itemStatus;
                    const category = item.item_category || item.itemCategory;
                    return (
                      <div key={id || index} className="item-mini-card">
                        <div className="item-mini-icon">
                          {getCategoryIcon(category)}
                        </div>
                        <div className="item-mini-info">
                          <span className="item-mini-name">{name}</span>
                          <span className={`item-mini-status ${status}`}>
                            {status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* How It Works Section */}
        <section className="instructions-section">
          <div className="section-header">
            <h2>How It Works</h2>
            <p>Quick guide to get started</p>
          </div>
          <div className="instructions-grid">
            <div className="instruction-card">
              <div className="instruction-number">1</div>
              <h3>Add Menu Items</h3>
              <p>Go to "Menu Items" to add dishes with descriptions</p>
            </div>
            <div className="instruction-card">
              <div className="instruction-number">2</div>
              <h3>Generate QR Codes</h3>
              <p>Create QR codes for each table pointing to /order/[restaurantId]/1, /order/[restaurantId]/2, etc.</p>
            </div>
            <div className="instruction-card">
              <div className="instruction-number">3</div>
              <h3>Customers Order</h3>
              <p>Customers scan QR, browse menu and order directly</p>
            </div>
            <div className="instruction-card">
              <div className="instruction-number">4</div>
              <h3>Track in Kitchen</h3>
              <p>View and manage orders in real-time from Kitchen Display</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="dashboard-footer">
          <p>© 2025 FineDine Restaurant Management System. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
};

export default AdminDashboard;
