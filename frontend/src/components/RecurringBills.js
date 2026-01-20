import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './RecurringBills.css';

const RecurringBills = ({ bill, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    category_name: '',
    amount: '',
    due_date: '',
    description: '',
  });
  const [categories, setCategories] = useState([]);
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const initializeForm = async () => {
      const loadedCategories = await fetchCategories();
      if (bill) {
        setFormData({
          category_name: bill.category_name || '',
          amount: bill.amount || '',
          due_date: bill.due_date || '',
          description: bill.description || '',
        });
        // Check if category exists in categories list after categories are loaded
        const categoryExists = loadedCategories.some(
          (cat) => cat.name === bill.category_name && cat.type === 'expense'
        );
        setUseCustomCategory(!categoryExists);
      }
    };
    initializeForm();
  }, [bill]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      const expenseCategories = response.data.filter((cat) => cat.type === 'expense');
      setCategories(expenseCategories);
      return expenseCategories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryModeChange = (e) => {
    const useCustom = e.target.value === 'custom';
    setUseCustomCategory(useCustom);
    if (!useCustom && categories.length > 0) {
      setFormData((prev) => ({ ...prev, category_name: '' }));
    } else {
      setFormData((prev) => ({ ...prev, category_name: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const billData = {
        category_name: formData.category_name,
        amount: parseFloat(formData.amount),
        due_date: parseInt(formData.due_date),
        description: formData.description || null,
      };

      if (bill) {
        await api.put(`/api/recurring-bills/${bill.id}`, billData);
      } else {
        await api.post('/api/recurring-bills', billData);
      }

      if (onSave) {
        onSave();
      }
      onClose();
    } catch (error) {
      console.error('Error saving recurring bill:', error);
      setError(error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Error saving recurring bill');
    } finally {
      setLoading(false);
    }
  };

  const expenseCategories = categories.filter((cat) => cat.type === 'expense');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{bill ? 'Edit Recurring Bill' : 'Add Recurring Bill'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="category_mode">Category Source</label>
            <select
              id="category_mode"
              value={useCustomCategory ? 'custom' : 'select'}
              onChange={handleCategoryModeChange}
            >
              <option value="select">Select from existing categories</option>
              <option value="custom">Enter custom category name</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="category_name">
              {useCustomCategory ? 'Category Name' : 'Category'}
            </label>
            {useCustomCategory ? (
              <input
                type="text"
                id="category_name"
                name="category_name"
                value={formData.category_name}
                onChange={handleChange}
                placeholder="Enter category name"
                required
              />
            ) : (
              <select
                id="category_name"
                name="category_name"
                value={formData.category_name}
                onChange={handleChange}
                required
              >
                <option value="">Select a category</option>
                {expenseCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="amount">Amount</label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="due_date">Due Date (Day of Month)</label>
              <input
                type="number"
                id="due_date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                min="1"
                max="31"
                placeholder="1-31"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Optional description for this bill"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : bill ? 'Update Bill' : 'Add Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecurringBills;
