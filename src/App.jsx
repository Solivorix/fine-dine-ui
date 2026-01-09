import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RestaurantProvider } from './contexts/RestaurantContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import RestaurantManagement from './pages/RestaurantManagement';
import MenuManagement from './pages/MenuManagement';
import TableBooking from './pages/TableBooking';
import OrderManagement from './pages/OrderManagement';
import UserManagement from './pages/UserManagement';
import KitchenDisplay from './pages/KitchenDisplay';
import TableQRGenerator from './pages/TableQRGenerator';
// RENAMED: Import AuthGuard but use it as ProtectedRoute
import ProtectedRoute from './components/AuthGuard';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <RestaurantProvider>
        <Router>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />
            
            {/* Customer ordering - public access */}
            <Route path="/order/:restaurantId/:tableNumber" element={<TableBooking />} />
            
            {/* Admin Dashboard - accessible by ADMIN, MANAGER, STAFF */}
            <Route path="/admin" element={
              <ProtectedRoute roles={['ADMIN', 'MANAGER', 'STAFF']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            {/* Restaurant Management - ADMIN only */}
            <Route path="/admin/restaurants" element={
              <ProtectedRoute roles={['ADMIN']}>
                <RestaurantManagement />
              </ProtectedRoute>
            } />
            
            {/* User Management - ADMIN ONLY */}
            <Route path="/admin/users" element={
              <ProtectedRoute roles={['ADMIN']}>
                <UserManagement />
              </ProtectedRoute>
            } />
            
            {/* Menu Management - ADMIN and MANAGER */}
            <Route path="/admin/menu" element={
              <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                <MenuManagement />
              </ProtectedRoute>
            } />
            
            {/* Pricing - ADMIN and MANAGER */}
            <Route path="/admin/pricing" element={
              <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                <MenuManagement />
              </ProtectedRoute>
            } />
            
            {/* Orders - ADMIN, MANAGER, STAFF */}
            <Route path="/admin/orders" element={
              <ProtectedRoute roles={['ADMIN', 'MANAGER', 'STAFF']}>
                <OrderManagement />
              </ProtectedRoute>
            } />
            
            {/* Kitchen Display - ADMIN, MANAGER, STAFF */}
            <Route path="/admin/kitchen" element={
              <ProtectedRoute roles={['ADMIN', 'MANAGER', 'STAFF']}>
                <KitchenDisplay />
              </ProtectedRoute>
            } />

            {/* Table QR Generator - ADMIN only */}
            <Route path="/admin/qr-codes" element={
              <ProtectedRoute roles={['ADMIN']}>
                <TableQRGenerator />
              </ProtectedRoute>
            } />

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Catch all - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </RestaurantProvider>
    </AuthProvider>
  );
}

export default App;
