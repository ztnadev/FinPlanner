const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get dashboard stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const userId = req.user.id;

    let dateFilter = '';
    const params = [userId];
    let paramIndex = 2;

    if (month && year) {
      dateFilter = `AND EXTRACT(MONTH FROM transaction_date) = $${paramIndex} AND EXTRACT(YEAR FROM transaction_date) = $${paramIndex + 1}`;
      params.push(parseInt(month), parseInt(year));
    }

    // Total income
    const incomeResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
       WHERE user_id = $1 AND type = 'income' ${dateFilter}`,
      params
    );

    // Total expenses
    const expenseResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
       WHERE user_id = $1 AND type = 'expense' ${dateFilter}`,
      params
    );

    // Expense breakdown by category
    const categoryResult = await pool.query(
      `SELECT category_name, SUM(amount) as total 
       FROM transactions 
       WHERE user_id = $1 AND type = 'expense' ${dateFilter}
       GROUP BY category_name
       ORDER BY total DESC`,
      params
    );

    // Monthly income vs expenses (last 12 months)
    const monthlyResult = await pool.query(
      `SELECT 
         EXTRACT(YEAR FROM transaction_date) as year,
         EXTRACT(MONTH FROM transaction_date) as month,
         type,
         SUM(amount) as total
       FROM transactions 
       WHERE user_id = $1 
         AND transaction_date >= CURRENT_DATE - INTERVAL '12 months'
       GROUP BY EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date), type
       ORDER BY year, month`,
      [userId]
    );

    const totalIncome = parseFloat(incomeResult.rows[0].total);
    const totalExpenses = parseFloat(expenseResult.rows[0].total);

    res.json({
      summary: {
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
      },
      categoryBreakdown: categoryResult.rows.map(row => ({
        category: row.category_name || 'Uncategorized',
        total: parseFloat(row.total),
      })),
      monthlyData: monthlyResult.rows.map(row => ({
        year: parseInt(row.year),
        month: parseInt(row.month),
        type: row.type,
        total: parseFloat(row.total),
      })),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
