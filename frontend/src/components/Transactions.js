import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../utils/api';
import TransactionForm from './TransactionForm';
import './Transactions.css';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchTransactions();
  }, [filterType, selectedMonth, selectedYear]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = { month: selectedMonth, year: selectedYear };
      if (filterType !== 'all') {
        params.type = filterType;
      }
      const response = await api.get('/api/transactions', { params });
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      await api.delete(`/api/transactions/${id}`);
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Error deleting transaction');
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTransaction(null);
    fetchTransactions();
  };

  const getReceiptUrl = (receiptPath) => {
    if (!receiptPath) return null;
    // Use relative path - nginx proxies /uploads to backend:5000
    if (receiptPath.startsWith('http')) return receiptPath;
    return receiptPath;
  };

  if (loading) {
    return <div className="loading">Loading transactions...</div>;
  }

  return (
    <div className="transactions">
      <div className="transactions-header">
        <h1>Transactions</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Add Transaction
        </button>
      </div>

      <div className="transactions-filters">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Transactions</option>
          <option value="income">Income</option>
          <option value="expense">Expenses</option>
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="filter-select"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
            <option key={month} value={month}>
              {format(new Date(2000, month - 1), 'MMMM')}
            </option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="filter-select"
        >
          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <TransactionForm
          transaction={editingTransaction}
          onClose={handleFormClose}
        />
      )}

      <div className="transactions-list">
        {transactions.length === 0 ? (
          <div className="no-transactions">
            No transactions found for the selected period.
          </div>
        ) : (
          transactions.map((transaction) => {
            const receiptUrl = getReceiptUrl(transaction.receipt_path);
            return (
              <div
                key={transaction.id}
                className={`transaction-card ${transaction.type}`}
              >
                <div className="transaction-main">
                  <div className="transaction-info">
                    <div className="transaction-header">
                      <h3>{transaction.category_name || 'Uncategorized'}</h3>
                      <span className={`transaction-amount ${transaction.type}`}>
                        {transaction.type === 'income' ? '+' : '-'}$
                        {parseFloat(transaction.amount).toFixed(2)}
                      </span>
                    </div>
                    {transaction.description && (
                      <p className="transaction-description">{transaction.description}</p>
                    )}
                    <div className="transaction-meta">
                      <span className="transaction-date">
                        {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                      </span>
                      <span className="transaction-type-badge">{transaction.type}</span>
                    </div>
                  </div>
                  {receiptUrl && (
                    <div className="transaction-receipt">
                      <img src={receiptUrl} alt="Receipt" className="receipt-thumbnail" />
                    </div>
                  )}
                </div>
                <div className="transaction-actions">
                  <button
                    onClick={() => handleEdit(transaction)}
                    className="btn-edit"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(transaction.id)}
                    className="btn-delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Transactions;
