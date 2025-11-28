import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { itemAPI, priceAPI, additionalPricingAPI } from '../services/api';
import './MenuManagement.css';

const MenuManagement = () => {
  const { logout } = useAuth();
  const [items, setItems] = useState([]);
  const [prices, setPrices] = useState([]);
  const [additionalPricings, setAdditionalPricings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form states
  const [itemForm, setItemForm] = useState({
    productName: '',
    productDescription: '',
    productImage: '',
    itemStatus: 'available',
    itemCategory: 'main'
  });

  const [priceForm, setPriceForm] = useState([
    { portion_size: 'regular', price: '', is_default: true }
  ]);

  const [additionalPricingForm, setAdditionalPricingForm] = useState([]);

  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, pricesRes, additionalRes] = await Promise.all([
        itemAPI.getAll(),
        priceAPI.getAll(),
        additionalPricingAPI.getAll()
      ]);

      setItems(itemsRes.data);
      setPrices(pricesRes.data);
      setAdditionalPricings(additionalRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setItemForm({
      productName: '',
      productDescription: '',
      productImage: '',
      itemStatus: 'available',
      itemCategory: 'main'
    });
    setPriceForm([
      { portion_size: 'regular', price: '', is_default: true }
    ]);
    setAdditionalPricingForm([]);
    setFormError('');
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!itemForm.productName.trim()) {
      setFormError('Product name is required');
      return;
    }

    if (priceForm.some(p => !p.price || parseFloat(p.price) <= 0)) {
      setFormError('All prices must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create Item
      const itemResponse = await itemAPI.create({
        product_name: itemForm.productName,
        product_description: itemForm.productDescription,
        product_image: itemForm.productImage,
        item_status: itemForm.itemStatus,
        item_category: itemForm.itemCategory
      });

      const newItemId = itemResponse.data.itemId || itemResponse.data.item_id;

      // Step 2: Create Prices
      const pricePromises = priceForm.map(priceData =>
        priceAPI.create({
          item_id: newItemId,
          portion_size: priceData.portion_size,
          price: parseFloat(priceData.price),
          is_default: priceData.is_default
        })
      );

      await Promise.all(pricePromises);

      // Step 3: Create Additional Pricings (if any)
      if (additionalPricingForm.length > 0) {
        const additionalPromises = additionalPricingForm.map(additional =>
          additionalPricingAPI.create({
            item_id: newItemId,
            pricing_name: additional.pricing_name,
            pricing_value: parseFloat(additional.pricing_value),
            pricing_type: additional.pricing_type
          })
        );

        await Promise.all(additionalPromises);
      }

      alert('Item added successfully!');
      setShowAddItemModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error adding item:', error);
      setFormError(error.response?.data?.message || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = async (e) => {
    e.preventDefault();
    setFormError('');

    setLoading(true);

    try {
      // Update item
      await itemAPI.patch(selectedItem.itemId || selectedItem.item_id, {
        product_name: itemForm.productName,
        product_description: itemForm.productDescription,
        product_image: itemForm.productImage,
        item_status: itemForm.itemStatus,
        item_category: itemForm.itemCategory
      });

      // Update prices
      const itemId = selectedItem.itemId || selectedItem.item_id;
      const existingPrices = prices.filter(p => p.item_id === itemId);

      // Delete old prices and create new ones
      await Promise.all(existingPrices.map(p => 
        priceAPI.delete(p.price_id)
      ));

      await Promise.all(priceForm.map(priceData =>
        priceAPI.create({
          item_id: itemId,
          portion_size: priceData.portion_size,
          price: parseFloat(priceData.price),
          is_default: priceData.is_default
        })
      ));

      alert('Item updated successfully!');
      setShowEditItemModal(false);
      fetchData();
    } catch (error) {
      console.error('Error updating item:', error);
      setFormError(error.response?.data?.message || 'Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    setLoading(true);

    try {
      // Delete associated prices first
      const itemPrices = prices.filter(p => p.item_id === itemId);
      await Promise.all(itemPrices.map(p => priceAPI.delete(p.price_id)));

      // Delete associated additional pricings
      const itemAdditional = additionalPricings.filter(a => a.item_id === itemId);
      await Promise.all(itemAdditional.map(a => 
        additionalPricingAPI.delete(a.additional_pricing_id)
      ));

      // Delete item
      await itemAPI.delete(itemId);

      alert('Item deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setItemForm({
      productName: item.productName || item.product_name,
      productDescription: item.productDescription || item.product_description,
      productImage: item.productImage || item.product_image || '',
      itemStatus: item.itemStatus || item.item_status,
      itemCategory: item.itemCategory || item.item_category
    });

    // Load prices for this item
    const itemId = item.itemId || item.item_id;
    const itemPrices = prices.filter(p => p.item_id === itemId);
    
    if (itemPrices.length > 0) {
      setPriceForm(itemPrices.map(p => ({
        portion_size: p.portion_size,
        price: p.price.toString(),
        is_default: p.is_default
      })));
    }

    setShowEditItemModal(true);
  };

  const addPriceRow = () => {
    setPriceForm([...priceForm, { 
      portion_size: '', 
      price: '', 
      is_default: false 
    }]);
  };

  const removePriceRow = (index) => {
    setPriceForm(priceForm.filter((_, i) => i !== index));
  };

  const updatePriceRow = (index, field, value) => {
    const newPriceForm = [...priceForm];
    newPriceForm[index][field] = value;
    setPriceForm(newPriceForm);
  };

  const addAdditionalPricingRow = () => {
    setAdditionalPricingForm([...additionalPricingForm, {
      pricing_name: '',
      pricing_value: '',
      pricing_type: 'fixed'
    }]);
  };

  const removeAdditionalPricingRow = (index) => {
    setAdditionalPricingForm(additionalPricingForm.filter((_, i) => i !== index));
  };

  const updateAdditionalPricingRow = (index, field, value) => {
    const newForm = [...additionalPricingForm];
    newForm[index][field] = value;
    setAdditionalPricingForm(newForm);
  };

  const getItemPrices = (itemId) => {
    return prices.filter(p => p.item_id === itemId);
  };

  return (
    <div className="menu-management">
      {/* Header */}
      <header className="admin-header">
        <div className="container">
          <div className="header-content">
            <div className="logo-section">
              <h1>📋 Menu Management</h1>
              <p>Manage items, prices, and additional charges</p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <Link to="/admin" className="btn btn-outline">
                Back to Dashboard
              </Link>
              <button className="btn btn-secondary" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="menu-main">
        <div className="container">
          {/* Add Item Button */}
          <div className="menu-header fade-in">
            <h2>Menu Items</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetForm();
                setShowAddItemModal(true);
              }}
            >
              + Add New Item
            </button>
          </div>

          {/* Items Grid */}
          {loading && items.length === 0 ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading menu items...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-icon">📋</div>
              <h3>No Menu Items</h3>
              <p>Click "Add New Item" to create your first menu item</p>
            </div>
          ) : (
            <div className="items-grid fade-in" style={{ animationDelay: '0.1s' }}>
              {items.map((item, index) => {
                const itemPrices = getItemPrices(item.itemId || item.item_id);
                
                return (
                  <div
                    key={item.itemId || item.item_id}
                    className="item-card card"
                    style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                  >
                    <div className="item-image">
                      {item.productImage || item.product_image ? (
                        <img src={item.productImage || item.product_image} alt={item.productName || item.product_name} />
                      ) : (
                        <div className="placeholder-image">
                          <span>🍽️</span>
                        </div>
                      )}
                      <span className={`status-badge ${item.itemStatus || item.item_status}`}>
                        {item.itemStatus || item.item_status}
                      </span>
                    </div>

                    <div className="item-content">
                      <h3>{item.productName || item.product_name}</h3>
                      <p className="item-description">
                        {item.productDescription || item.product_description || 'No description'}
                      </p>
                      
                      <div className="item-category">
                        <span className="badge">{item.itemCategory || item.item_category}</span>
                      </div>

                      <div className="item-prices">
                        {itemPrices.map((price) => (
                          <div key={price.price_id} className="price-tag">
                            <span className="portion">{price.portion_size}</span>
                            <span className="price">₹{price.price}</span>
                          </div>
                        ))}
                      </div>

                      <div className="item-actions">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => openEditModal(item)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: 'var(--error)', color: 'white' }}
                          onClick={() => handleDeleteItem(item.itemId || item.item_id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="modal-overlay" onClick={() => setShowAddItemModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Menu Item</h2>
              <button className="close-btn" onClick={() => setShowAddItemModal(false)}>×</button>
            </div>

            <form onSubmit={handleAddItem} className="modal-body">
              {formError && (
                <div className="alert alert-error">
                  {formError}
                </div>
              )}

              {/* Item Details Section */}
              <div className="form-section">
                <h3>Item Details</h3>
                
                <div className="input-group">
                  <label className="input-label">Product Name *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Margherita Pizza"
                    value={itemForm.productName}
                    onChange={(e) => setItemForm({...itemForm, productName: e.target.value})}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Description</label>
                  <textarea
                    className="textarea"
                    placeholder="Brief description of the item"
                    value={itemForm.productDescription}
                    onChange={(e) => setItemForm({...itemForm, productDescription: e.target.value})}
                    rows="3"
                  />
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Category</label>
                    <select
                      className="select"
                      value={itemForm.itemCategory}
                      onChange={(e) => setItemForm({...itemForm, itemCategory: e.target.value})}
                    >
                      <option value="starter">Starter</option>
                      <option value="main">Main Course</option>
                      <option value="dessert">Dessert</option>
                      <option value="beverage">Beverage</option>
                      <option value="appetizer">Appetizer</option>
                      <option value="soup">Soup</option>
                      <option value="salad">Salad</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Status</label>
                    <select
                      className="select"
                      value={itemForm.itemStatus}
                      onChange={(e) => setItemForm({...itemForm, itemStatus: e.target.value})}
                    >
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Image URL (optional)</label>
                  <input
                    type="url"
                    className="input"
                    placeholder="https://example.com/image.jpg"
                    value={itemForm.productImage}
                    onChange={(e) => setItemForm({...itemForm, productImage: e.target.value})}
                  />
                </div>
              </div>

              {/* Pricing Section */}
              <div className="form-section">
                <div className="section-header-inline">
                  <h3>Pricing *</h3>
                  <button type="button" className="btn btn-sm btn-outline" onClick={addPriceRow}>
                    + Add Size/Portion
                  </button>
                </div>

                {priceForm.map((price, index) => (
                  <div key={index} className="price-row">
                    <div className="input-group">
                      <label className="input-label">Portion Size</label>
                      <select
                        className="select"
                        value={price.portion_size}
                        onChange={(e) => updatePriceRow(index, 'portion_size', e.target.value)}
                        required
                      >
                        <option value="">Select Size</option>
                        <option value="small">Small</option>
                        <option value="regular">Regular</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                        <option value="full">Full</option>
                        <option value="half">Half</option>
                        <option value="quarter">Quarter</option>
                      </select>
                    </div>

                    <div className="input-group">
                      <label className="input-label">Price (₹)</label>
                      <input
                        type="number"
                        className="input"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={price.price}
                        onChange={(e) => updatePriceRow(index, 'price', e.target.value)}
                        required
                      />
                    </div>

                    <div className="input-group checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={price.is_default}
                          onChange={(e) => updatePriceRow(index, 'is_default', e.target.checked)}
                        />
                        Default
                      </label>
                    </div>

                    {priceForm.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost remove-btn"
                        onClick={() => removePriceRow(index)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Additional Pricing Section */}
              <div className="form-section">
                <div className="section-header-inline">
                  <h3>Additional Charges (Optional)</h3>
                  <button type="button" className="btn btn-sm btn-outline" onClick={addAdditionalPricingRow}>
                    + Add Charge
                  </button>
                </div>

                <p className="section-hint">Add extra charges like packaging, delivery, service charges, etc.</p>

                {additionalPricingForm.map((additional, index) => (
                  <div key={index} className="price-row">
                    <div className="input-group">
                      <label className="input-label">Charge Name</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g., Packaging"
                        value={additional.pricing_name}
                        onChange={(e) => updateAdditionalPricingRow(index, 'pricing_name', e.target.value)}
                        required
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-label">Value</label>
                      <input
                        type="number"
                        className="input"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={additional.pricing_value}
                        onChange={(e) => updateAdditionalPricingRow(index, 'pricing_value', e.target.value)}
                        required
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-label">Type</label>
                      <select
                        className="select"
                        value={additional.pricing_type}
                        onChange={(e) => updateAdditionalPricingRow(index, 'pricing_type', e.target.value)}
                      >
                        <option value="fixed">Fixed (₹)</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-ghost remove-btn"
                      onClick={() => removeAdditionalPricingRow(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAddItemModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Adding Item...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditItemModal && (
        <div className="modal-overlay" onClick={() => setShowEditItemModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Menu Item</h2>
              <button className="close-btn" onClick={() => setShowEditItemModal(false)}>×</button>
            </div>

            <form onSubmit={handleEditItem} className="modal-body">
              {formError && (
                <div className="alert alert-error">
                  {formError}
                </div>
              )}

              {/* Item Details Section */}
              <div className="form-section">
                <h3>Item Details</h3>
                
                <div className="input-group">
                  <label className="input-label">Product Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={itemForm.productName}
                    onChange={(e) => setItemForm({...itemForm, productName: e.target.value})}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Description</label>
                  <textarea
                    className="textarea"
                    value={itemForm.productDescription}
                    onChange={(e) => setItemForm({...itemForm, productDescription: e.target.value})}
                    rows="3"
                  />
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Category</label>
                    <select
                      className="select"
                      value={itemForm.itemCategory}
                      onChange={(e) => setItemForm({...itemForm, itemCategory: e.target.value})}
                    >
                      <option value="starter">Starter</option>
                      <option value="main">Main Course</option>
                      <option value="dessert">Dessert</option>
                      <option value="beverage">Beverage</option>
                      <option value="appetizer">Appetizer</option>
                      <option value="soup">Soup</option>
                      <option value="salad">Salad</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Status</label>
                    <select
                      className="select"
                      value={itemForm.itemStatus}
                      onChange={(e) => setItemForm({...itemForm, itemStatus: e.target.value})}
                    >
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Image URL</label>
                  <input
                    type="url"
                    className="input"
                    value={itemForm.productImage}
                    onChange={(e) => setItemForm({...itemForm, productImage: e.target.value})}
                  />
                </div>
              </div>

              {/* Pricing Section */}
              <div className="form-section">
                <div className="section-header-inline">
                  <h3>Pricing *</h3>
                  <button type="button" className="btn btn-sm btn-outline" onClick={addPriceRow}>
                    + Add Size/Portion
                  </button>
                </div>

                {priceForm.map((price, index) => (
                  <div key={index} className="price-row">
                    <div className="input-group">
                      <label className="input-label">Portion Size</label>
                      <select
                        className="select"
                        value={price.portion_size}
                        onChange={(e) => updatePriceRow(index, 'portion_size', e.target.value)}
                        required
                      >
                        <option value="">Select Size</option>
                        <option value="small">Small</option>
                        <option value="regular">Regular</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                        <option value="full">Full</option>
                        <option value="half">Half</option>
                        <option value="quarter">Quarter</option>
                      </select>
                    </div>

                    <div className="input-group">
                      <label className="input-label">Price (₹)</label>
                      <input
                        type="number"
                        className="input"
                        step="0.01"
                        min="0"
                        value={price.price}
                        onChange={(e) => updatePriceRow(index, 'price', e.target.value)}
                        required
                      />
                    </div>

                    <div className="input-group checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={price.is_default}
                          onChange={(e) => updatePriceRow(index, 'is_default', e.target.checked)}
                        />
                        Default
                      </label>
                    </div>

                    {priceForm.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost remove-btn"
                        onClick={() => removePriceRow(index)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowEditItemModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
