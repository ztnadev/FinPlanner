const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all transactions for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { month, year, type } = req.query;
    let query = 'SELECT * FROM transactions WHERE user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM transaction_date) = $${paramIndex} AND EXTRACT(YEAR FROM transaction_date) = $${paramIndex + 1}`;
      params.push(parseInt(month), parseInt(year));
      paramIndex += 2;
    }

    if (type && ['income', 'expense'].includes(type)) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
    }

    query += ' ORDER BY transaction_date DESC, created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single transaction
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create transaction
router.post('/', authenticateToken, [
  body('type').isIn(['income', 'expense']),
  body('amount').isFloat({ min: 0.01 }),
  body('transaction_date').isISO8601().toDate(),
  body('category_name').optional().trim(),
  body('description').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, amount, category_name, description, transaction_date, receipt_path } = req.body;

    let categoryId = null;
    if (category_name) {
      const categoryResult = await pool.query(
        'SELECT id FROM categories WHERE user_id = $1 AND name = $2 AND type = $3',
        [req.user.id, category_name, type]
      );
      if (categoryResult.rows.length > 0) {
        categoryId = categoryResult.rows[0].id;
      }
    }

    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, category_id, category_name, description, transaction_date, receipt_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, type, amount, categoryId, category_name, description, transaction_date, receipt_path]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update transaction
router.put('/:id', authenticateToken, [
  body('type').optional().isIn(['income', 'expense']),
  body('amount').optional().isFloat({ min: 0.01 }),
  body('transaction_date').optional().isISO8601().toDate(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, amount, category_name, description, transaction_date, receipt_path } = req.body;

    // Verify ownership
    const existing = await pool.query(
      'SELECT id FROM transactions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    let categoryId = null;
    if (category_name) {
      // Get transaction type if not provided
      let transactionType = type;
      if (!transactionType) {
        const existingTypeResult = await pool.query(
          'SELECT type FROM transactions WHERE id = $1 AND user_id = $2',
          [req.params.id, req.user.id]
        );
        if (existingTypeResult.rows.length > 0) {
          transactionType = existingTypeResult.rows[0].type;
        }
      }
      
      if (transactionType) {
        const categoryResult = await pool.query(
          'SELECT id FROM categories WHERE user_id = $1 AND name = $2 AND type = $3',
          [req.user.id, category_name, transactionType]
        );
        if (categoryResult.rows.length > 0) {
          categoryId = categoryResult.rows[0].id;
        }
      }
    }

    const result = await pool.query(
      `UPDATE transactions 
       SET type = COALESCE($1, type),
           amount = COALESCE($2, amount),
           category_id = COALESCE($3, category_id),
           category_name = COALESCE($4, category_name),
           description = COALESCE($5, description),
           transaction_date = COALESCE($6, transaction_date),
           receipt_path = COALESCE($7, receipt_path),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [type, amount, categoryId, category_name, description, transaction_date, receipt_path, req.params.id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete transaction
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
