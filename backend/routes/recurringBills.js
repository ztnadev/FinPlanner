const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all recurring bills for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM recurring_bills WHERE user_id = $1 ORDER BY due_date, category_name',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get recurring bills error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recurring bills for a specific month with completion status
router.get('/month', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const userId = req.user.id;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Get all recurring bills for the user
    const billsResult = await pool.query(
      'SELECT * FROM recurring_bills WHERE user_id = $1 ORDER BY due_date, category_name',
      [userId]
    );

    // Get all expenses for the month grouped by category
    const expensesResult = await pool.query(
      `SELECT category_name, COUNT(*) as count 
       FROM transactions 
       WHERE user_id = $1 
         AND type = 'expense' 
         AND EXTRACT(MONTH FROM transaction_date) = $2 
         AND EXTRACT(YEAR FROM transaction_date) = $3
       GROUP BY category_name`,
      [userId, monthNum, yearNum]
    );

    // Create a map of category names to expense counts
    const expenseMap = {};
    expensesResult.rows.forEach(row => {
      expenseMap[row.category_name] = parseInt(row.count);
    });

    // Add completion status to each bill
    const billsWithStatus = billsResult.rows.map(bill => ({
      ...bill,
      amount: parseFloat(bill.amount),
      is_complete: expenseMap[bill.category_name] > 0 || false,
      expense_count: expenseMap[bill.category_name] || 0,
    }));

    res.json(billsWithStatus);
  } catch (error) {
    console.error('Get recurring bills for month error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single recurring bill
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM recurring_bills WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring bill not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get recurring bill error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create recurring bill
router.post('/', authenticateToken, [
  body('category_name').trim().notEmpty().withMessage('Category name is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('due_date').isInt({ min: 1, max: 31 }).withMessage('Due date must be between 1 and 31'),
  body('description').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category_name, amount, due_date, description } = req.body;

    const result = await pool.query(
      `INSERT INTO recurring_bills (user_id, category_name, amount, due_date, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, category_name, amount, due_date, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create recurring bill error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update recurring bill
router.put('/:id', authenticateToken, [
  body('category_name').optional().trim().notEmpty(),
  body('amount').optional().isFloat({ min: 0.01 }),
  body('due_date').optional().isInt({ min: 1, max: 31 }),
  body('description').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category_name, amount, due_date, description } = req.body;

    // Verify ownership
    const existing = await pool.query(
      'SELECT id FROM recurring_bills WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring bill not found' });
    }

    const result = await pool.query(
      `UPDATE recurring_bills 
       SET category_name = COALESCE($1, category_name),
           amount = COALESCE($2, amount),
           due_date = COALESCE($3, due_date),
           description = COALESCE($4, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [category_name, amount, due_date, description || null, req.params.id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update recurring bill error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete recurring bill
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM recurring_bills WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring bill not found' });
    }

    res.json({ message: 'Recurring bill deleted' });
  } catch (error) {
    console.error('Delete recurring bill error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
