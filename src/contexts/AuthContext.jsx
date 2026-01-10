import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, userAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('📦 Restored user from storage:', parsedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (loginId, password) => {
    try {
      console.log('🔐 Attempting login with:', { loginId });
      
      const response = await authAPI.login(loginId, password);
      
      console.log('📥 Full login response:', response);
      console.log('📥 Response data:', response.data);

      // Backend returns: { token, userId, userName, role }
      if (response.data && response.data.token) {
        const { token, userId, userName, role } = response.data;

        console.log('✅ Extracted from response:', { token, userId, userName, role });

        if (!role) {
          console.error('❌ No role in response! Response data:', response.data);
          return {
            success: false,
            error: 'Server did not return user role. Please contact administrator.'
          };
        }

        // Store token first (needed for API calls)
        localStorage.setItem('token', token);

        // Create initial user object
        let userData = {
          user_id: userId,
          user_name: userName,
          role: role,
          token,
          restaurant_id: null // Will be fetched for non-admin users
        };

        // For non-admin users, fetch full user details to get restaurant_id
        if (role.toUpperCase() !== 'ADMIN') {
          try {
            console.log('📡 Fetching user details for restaurant_id...');
            const userDetailsRes = await userAPI.getById(userId);
            if (userDetailsRes.data) {
              const restaurantId = userDetailsRes.data.restaurant_id || userDetailsRes.data.restaurantId;
              userData.restaurant_id = restaurantId;
              console.log('🏪 User restaurant_id:', restaurantId);
            }
          } catch (err) {
            console.warn('⚠️ Could not fetch user details:', err);
            // Continue without restaurant_id - will default to showing no data
          }
        }

        console.log('💾 Storing user data:', userData);
        console.log('🔑 User role:', role);

        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);

        return { success: true };
      } else {
        console.error('❌ Invalid response structure:', response.data);
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        console.error('Error response:', error.response);
        if (error.response.status === 401) {
          errorMessage = 'Invalid credentials. Please check your username and password.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        errorMessage = 'Cannot connect to server. Please check your connection.';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    console.log('👋 Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const forgotPassword = async (loginId) => {
    try {
      await authAPI.forgotPassword(loginId);
      return { success: true };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to send OTP. Please try again.' 
      };
    }
  };

  const resetPassword = async (otp, newPassword) => {
    try {
      await authAPI.resetPassword(otp, newPassword);
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to reset password. Please try again.' 
      };
    }
  };

  // Helper function to check if user is admin
  const isAdmin = () => {
    return user?.role?.toUpperCase() === 'ADMIN';
  };

  // Helper function to get user's restaurant ID (returns null for admin)
  const getUserRestaurantId = () => {
    if (isAdmin()) return null; // Admin can see all restaurants
    return user?.restaurant_id || null;
  };

  // Helper function to check if user has access to a specific restaurant
  const hasRestaurantAccess = (restaurantId) => {
    if (isAdmin()) return true; // Admin has access to all
    return user?.restaurant_id === restaurantId;
  };

  const value = {
    user,
    login,
    logout,
    forgotPassword,
    resetPassword,
    isAuthenticated: !!user,
    loading,
    isAdmin,
    getUserRestaurantId,
    hasRestaurantAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
