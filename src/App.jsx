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
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <RestaurantProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Customer ordering - URL: /order/{restaurantId}/{tableNumber} */}
            <Route path="/order/:restaurantId/:tableNumber" element={<TableBooking />} />
            
            <Route path="/admin" element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/restaurants" element={
              <ProtectedRoute roles={['ADMIN']}>
                <RestaurantManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/users" element={
              <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                <UserManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/menu" element={
              <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                <MenuManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/pricing" element={
              <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                <MenuManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/orders" element={
              <ProtectedRoute roles={['ADMIN', 'MANAGER', 'STAFF']}>
                <OrderManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/kitchen" element={
              <ProtectedRoute roles={['ADMIN', 'MANAGER', 'STAFF']}>
                <KitchenDisplay />
              </ProtectedRoute>
            } />
            
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </RestaurantProvider>
    </AuthProvider>
  );
}

export default App;
