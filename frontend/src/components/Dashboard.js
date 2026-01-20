import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import api from '../utils/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const COLORS = ['#667eea', '#f093fb', '#4facfe', '#00f2fe', '#fa709a', '#fee140', '#30cfd0', '#330867'];

  useEffect(() => {
    fetchStats();
  }, [selectedMonth, selectedYear]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/dashboard/stats', {
        params: { month: selectedMonth, year: selectedYear },
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepareMonthlyData = () => {
    if (!stats?.monthlyData) return [];

    const monthlyMap = {};
    stats.monthlyData.forEach((item) => {
      const key = `${item.year}-${item.month}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = { month: `${item.month}/${item.year}`, income: 0, expenses: 0 };
      }
      monthlyMap[key][item.type === 'income' ? 'income' : 'expenses'] = item.total;
    });

    return Object.values(monthlyMap).slice(-12);
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (!stats) {
    return <div className="error-message">Error loading dashboard data</div>;
  }

  const monthlyData = prepareMonthlyData();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="date-filter">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
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
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card income">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>Total Income</h3>
            <p className="card-amount">${stats.summary.totalIncome.toFixed(2)}</p>
          </div>
        </div>
        <div className="summary-card expense">
          <div className="card-icon">💸</div>
          <div className="card-content">
            <h3>Total Expenses</h3>
            <p className="card-amount">${stats.summary.totalExpenses.toFixed(2)}</p>
          </div>
        </div>
        <div className="summary-card balance">
          <div className="card-icon">⚖️</div>
          <div className="card-content">
            <h3>Net Balance</h3>
            <p className={`card-amount ${stats.summary.netBalance >= 0 ? 'positive' : 'negative'}`}>
              ${stats.summary.netBalance.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-card">
          <h2>Monthly Income vs Expenses</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="income" fill="#667eea" name="Income" />
              <Bar dataKey="expenses" fill="#f093fb" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h2>Expense Breakdown by Category</h2>
          {stats.categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {stats.categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No expense data for this month</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
