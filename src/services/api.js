import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
// Backend expects: { "loginId": "username", "password": "password" }
export const authAPI = {
  login: (loginIdParam, passwordParam) => {
    // Explicitly create the request body object
    // Using different param names to avoid any confusion
    const requestBody = {
      loginId: String(loginIdParam),
      password: String(passwordParam)
    };
    console.log('=== API LOGIN DEBUG ===');
    console.log('Request URL:', API_BASE_URL + '/auth/login');
    console.log('Request body:', JSON.stringify(requestBody));
    return api.post('/auth/login', requestBody);
  },
  
  forgotPassword: (loginId) =>
    api.post('/auth/forgot-password', { loginId }),
  
  resetPassword: (otp, newPassword) =>
    api.post('/auth/reset-password', { otp, newPassword }),
};

// Restaurant API
export const restaurantAPI = {
  getAll: () => api.get('/restaurants'),
  
  getById: (restaurantId) => api.get(`/restaurants/${restaurantId}`),
  
  create: (data) => api.post('/restaurants', data),
  
  update: (restaurantId, data) => api.put(`/restaurants/${restaurantId}`, data),
  
  patch: (restaurantId, data) => api.patch(`/restaurants/${restaurantId}`, data),
  
  delete: (restaurantId) => api.delete(`/restaurants/${restaurantId}`),
};

// User API
export const userAPI = {
  getAll: () => api.get('/users'),
  
  getById: (userId) => api.get(`/users/${userId}`),
  
  create: (data) => api.post('/users', data),
  
  update: (userId, data) => api.put(`/users/${userId}`, data),
  
  patch: (userId, data) => api.patch(`/users/${userId}`, data),
  
  delete: (userId) => api.delete(`/users/${userId}`),
  
  findByUserName: (username) => 
    api.get(`/userEntities/search/findByUserName?username=${username}`),
};

// Item API - Uses camelCase field names (itemId, productName, restaurantId, etc.)
export const itemAPI = {
  getAll: () => api.get('/items'),
  
  getById: (itemId) => api.get(`/items/${itemId}`),
  
  create: (items) => api.post('/items', Array.isArray(items) ? items : [items]),
  
  update: (itemId, data) => api.put(`/items/${itemId}`, data),
  
  patch: (itemId, data) => api.patch(`/items/${itemId}`, data),
  
  delete: (itemId) => api.delete(`/items/${itemId}`),
};

// Price API - Uses snake_case field names (price_id, restaurant_id, portion_size, item_id, price)
export const priceAPI = {
  getAll: () => api.get('/prices'),
  
  getById: (priceId) => api.get(`/prices/${priceId}`),
  
  create: (data) => api.post('/prices', data),
  
  update: (priceId, data) => api.put(`/prices/${priceId}`, data),
  
  patch: (priceId, data) => api.patch(`/prices/${priceId}`, data),
  
  delete: (priceId) => api.delete(`/prices/${priceId}`),
};

// Service Type API
export const serviceTypeAPI = {
  getAll: () => api.get('/service-types'),
  
  getById: (serviceTypeId) => api.get(`/service-types/${serviceTypeId}`),
  
  create: (data) => api.post('/service-types', data),
  
  update: (serviceTypeId, data) => api.put(`/service-types/${serviceTypeId}`, data),
  
  patch: (serviceTypeId, data) => api.patch(`/service-types/${serviceTypeId}`, data),
  
  delete: (serviceTypeId) => api.delete(`/service-types/${serviceTypeId}`),
};

// Additional Pricing API - Uses camelCase field names
export const additionalPricingAPI = {
  getAll: () => api.get('/additional-pricings'),
  
  getById: (id) => api.get(`/additional-pricings/${id}`),
  
  create: (data) => api.post('/additional-pricings', data),
  
  update: (id, data) => api.put(`/additional-pricings/${id}`, data),
  
  patch: (id, data) => api.patch(`/additional-pricings/${id}`, data),
  
  delete: (id) => api.delete(`/additional-pricings/${id}`),
};

// Order API
export const orderAPI = {
  getAll: () => api.get('/orders'),
  
  getById: (orderId) => api.get(`/orders/${orderId}`),
  
  create: (data) => api.post('/orders', data),
  
  update: (orderId, data) => api.put(`/orders/${orderId}`, data),
  
  patch: (orderId, data) => api.patch(`/orders/${orderId}`, data),
  
  updateStatus: (orderId, status) => api.patch(`/orders/${orderId}`, { order_status: status, orderStatus: status }),
  
  delete: (orderId) => api.delete(`/orders/${orderId}`),
};

// Upload API
export const uploadAPI = {
  uploadItemImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/upload/item-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  uploadRestaurantImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/upload/restaurant-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  deleteImage: (imageUrl) => api.delete(`/api/upload/image?url=${encodeURIComponent(imageUrl)}`),
};

export default api;