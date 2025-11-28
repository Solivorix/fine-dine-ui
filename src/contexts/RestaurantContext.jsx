import React, { createContext, useState, useContext, useCallback } from 'react';
import { restaurantAPI, itemAPI, priceAPI, serviceTypeAPI } from '../services/api';

const RestaurantContext = createContext();

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within RestaurantProvider');
  }
  return context;
};

export const RestaurantProvider = ({ children }) => {
  const [restaurants, setRestaurants] = useState([]);
  const [currentRestaurant, setCurrentRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [prices, setPrices] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all restaurants
  const fetchRestaurants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await restaurantAPI.getAll();
      setRestaurants(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch restaurants');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch restaurant by ID
  const fetchRestaurantById = useCallback(async (restaurantId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await restaurantAPI.getById(restaurantId);
      setCurrentRestaurant(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch restaurant');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create restaurant
  const createRestaurant = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);
      const response = await restaurantAPI.create(data);
      setRestaurants((prev) => [...prev, response.data]);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create restaurant');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update restaurant
  const updateRestaurant = useCallback(async (restaurantId, data) => {
    try {
      setLoading(true);
      setError(null);
      const response = await restaurantAPI.update(restaurantId, data);
      setRestaurants((prev) =>
        prev.map((r) => (r.rest_id === restaurantId ? response.data : r))
      );
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update restaurant');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete restaurant
  const deleteRestaurant = useCallback(async (restaurantId) => {
    try {
      setLoading(true);
      setError(null);
      await restaurantAPI.delete(restaurantId);
      setRestaurants((prev) => prev.filter((r) => r.rest_id !== restaurantId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete restaurant');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch menu items
  const fetchMenuItems = useCallback(async (restaurantId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await itemAPI.getAll();
      const filteredItems = response.data.filter(
        (item) => item.restaurantId === restaurantId
      );
      setMenuItems(filteredItems);
      return filteredItems;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch menu items');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create menu item
  const createMenuItem = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);
      const response = await itemAPI.create(data);
      const newItem = Array.isArray(response.data) ? response.data[0] : response.data;
      setMenuItems((prev) => [...prev, newItem]);
      return newItem;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create menu item');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update menu item
  const updateMenuItem = useCallback(async (itemId, data) => {
    try {
      setLoading(true);
      setError(null);
      const response = await itemAPI.update(itemId, data);
      setMenuItems((prev) =>
        prev.map((item) => (item.itemId === itemId ? response.data : item))
      );
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update menu item');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete menu item
  const deleteMenuItem = useCallback(async (itemId) => {
    try {
      setLoading(true);
      setError(null);
      await itemAPI.delete(itemId);
      setMenuItems((prev) => prev.filter((item) => item.itemId !== itemId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete menu item');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch prices
  const fetchPrices = useCallback(async (restaurantId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await priceAPI.getAll();
      const filteredPrices = response.data.filter(
        (price) => price.restaurant_id === restaurantId
      );
      setPrices(filteredPrices);
      return filteredPrices;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch prices');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch service types
  const fetchServiceTypes = useCallback(async (restaurantId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await serviceTypeAPI.getAll();
      const filteredTypes = response.data.filter(
        (type) => type.restaurant_id === restaurantId
      );
      setServiceTypes(filteredTypes);
      return filteredTypes;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch service types');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    restaurants,
    currentRestaurant,
    menuItems,
    prices,
    serviceTypes,
    loading,
    error,
    fetchRestaurants,
    fetchRestaurantById,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant,
    fetchMenuItems,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    fetchPrices,
    fetchServiceTypes,
  };

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
};
