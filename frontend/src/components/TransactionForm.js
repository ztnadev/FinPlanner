import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../utils/api';
import './TransactionForm.css';

const TransactionForm = ({ transaction, onClose }) => {
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category_name: '',
    description: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    receipt: null,
    receiptPath: transaction?.receipt_path || '',
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receiptPreview, setReceiptPreview] = useState(null);

  useEffect(() => {
    if (transaction) {
      setFormData({
        type: transaction.type,
        amount: transaction.amount,
        category_name: transaction.category_name || '',
        description: transaction.description || '',
        transaction_date: format(new Date(transaction.transaction_date), 'yyyy-MM-dd'),
        receipt: null,
        receiptPath: transaction.receipt_path || '',
      });
      if (transaction.receipt_path) {
        const receiptUrl = transaction.receipt_path.startsWith('http')
          ? transaction.receipt_path
          : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${transaction.receipt_path}`;
        setReceiptPreview(receiptUrl);
      }
    }
    fetchCategories();
  }, [transaction]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, receipt: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let receiptPath = formData.receiptPath;

      // Upload receipt if new file is selected
      if (formData.receipt) {
        const formDataToSend = new FormData();
        formDataToSend.append('receipt', formData.receipt);
        const uploadResponse = await api.post('/api/receipts/upload', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        receiptPath = uploadResponse.data.path;
      }

      const transactionData = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        category_name: formData.category_name,
        description: formData.description,
        transaction_date: formData.transaction_date,
        receipt_path: receiptPath,
      };

      if (transaction) {
        await api.put(`/api/transactions/${transaction.id}`, transactionData);
      } else {
        await api.post('/api/transactions', transactionData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      setError(error.response?.data?.error || 'Error saving transaction');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((cat) => cat.type === formData.type);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{transaction ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Type</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

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
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category_name">Category</label>
              <input
                type="text"
                id="category_name"
                name="category_name"
                value={formData.category_name}
                onChange={handleChange}
                list="categories-list"
                placeholder="Enter category"
              />
              <datalist id="categories-list">
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.name} />
                ))}
              </datalist>
            </div>

            <div className="form-group">
              <label htmlFor="transaction_date">Date</label>
              <input
                type="date"
                id="transaction_date"
                name="transaction_date"
                value={formData.transaction_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="receipt">Receipt (optional)</label>
            <input
              type="file"
              id="receipt"
              name="receipt"
              accept="image/*"
              onChange={handleFileChange}
            />
            {receiptPreview && (
              <div className="receipt-preview">
                <img src={receiptPreview} alt="Receipt preview" />
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Saving...' : transaction ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
