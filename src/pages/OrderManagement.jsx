import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderAPI, itemAPI } from '../services/api';

const OrderManagement = () => {
  const { logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersRes, itemsRes] = await Promise.all([
        orderAPI.getAll(),
        itemAPI.getAll(),
      ]);
      setOrders(ordersRes.data);
      setItems(itemsRes.data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getItemName = (productId) => {
    const item = items.find(i => i.productId === productId);
    return item?.productName || 'Unknown Item';
  };

  // Group orders by table
  const ordersByTable = orders.reduce((acc, order) => {
    const table = order.tableNumber || 'Unknown';
    if (!acc[table]) acc[table] = [];
    acc[table].push(order);
    return acc;
  }, {});

  return (
    <div style={{ padding: 'var(--spacing-xl)' }}>
      <header style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Order Management</h1>
          <p style={{ color: 'var(--text-light)', marginTop: 'var(--spacing-xs)' }}>
            Total Orders: {orders.length}
          </p>
        </div>
        <button className="btn btn-outline" onClick={logout}>Logout</button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-3xl)' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
          <p>Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ padding: 'var(--spacing-3xl)', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-lg)' }}>🛎️</div>
          <h3>No Orders Yet</h3>
          <p style={{ color: 'var(--text-light)', marginTop: 'var(--spacing-sm)' }}>
            Orders will appear here when customers place them
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
          {Object.entries(ordersByTable).map(([tableNumber, tableOrders]) => (
            <div key={tableNumber} className="card" style={{ padding: 'var(--spacing-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-md)', borderBottom: '2px solid var(--border)' }}>
                <div>
                  <h2 style={{ marginBottom: 'var(--spacing-xs)' }}>Table {tableNumber}</h2>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                    {tableOrders.length} item{tableOrders.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="badge badge-warning">Pending</span>
              </div>

              <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                {tableOrders.map((order) => (
                  <div key={order.orderId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md)', background: 'var(--bg)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <h4 style={{ marginBottom: 'var(--spacing-xs)' }}>{getItemName(order.productId)}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Ordered by: {order.createdBy}
                      </p>
                      {order.createdAt && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--spacing-xs)' }}>
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                      <button className="btn btn-sm btn-primary">Complete</button>
                      <button className="btn btn-sm btn-ghost" style={{ color: 'var(--error)' }}>Cancel</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 'var(--spacing-2xl)' }} className="card" style={{ padding: 'var(--spacing-lg)', background: 'var(--accent-light)' }}>
        <p style={{ color: 'var(--text)', fontSize: '0.9rem' }}>
          💡 <strong>Tip:</strong> Orders refresh automatically in real-time. You can mark orders as complete or cancel them as needed.
        </p>
      </div>
    </div>
  );
};

export default OrderManagement;
