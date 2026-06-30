/**
 * ============================================================================
 * PAYMENT ROUTES — Student Fee Payments & History
 * ============================================================================
 * All routes require authentication.
 *
 * GET  /balance      — fee breakdown, paid/remaining per fee type
 * POST /pay          — make a fee payment (processed through smart contract)
 * GET  /history      — list all payments for the logged-in user
 * GET  /receipt/:id  — retrieve a single payment receipt with block info
 * POST /installment  — create an installment plan
 * POST /installment/pay — pay a specific installment
 *
 * CSC476 Group 16 — Blockchain-Based School Payment System
 * ============================================================================
 */

const express = require('express');
const { db } = require('../database');
const { blockchain } = require('../blockchain');
const {
  TuitionPaymentContract,
  InstallmentContract,
  EXCHANGE_RATE
} = require('../smart-contracts');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All payment routes require authentication
router.use(authenticateToken);

// ---------------------------------------------------------------------------
// GET /balance — Fee breakdown for the logged-in student
// ---------------------------------------------------------------------------
router.get('/balance', (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all fee schedules for the current semester
    const feeSchedules = db.prepare(
      `SELECT * FROM fee_schedules WHERE semester = '2025/2026 First Semester' ORDER BY fee_type`
    ).all();

    // For each fee type, calculate how much has been paid
    const feeBreakdown = feeSchedules.map(fee => {
      const paidResult = db.prepare(
        `SELECT COALESCE(SUM(amount), 0) as total_paid
         FROM payments
         WHERE user_id = ? AND fee_type = ? AND status = 'confirmed'`
      ).get(userId, fee.fee_type);

      return {
        feeType: fee.fee_type,
        totalAmount: fee.amount,
        totalPaid: paidResult.total_paid,
        remaining: fee.amount - paidResult.total_paid,
        fullyPaid: paidResult.total_paid >= fee.amount,
        dueDate: fee.due_date,
        description: fee.description
      };
    });

    // Aggregate totals
    const totalOwed = feeBreakdown.reduce((sum, f) => sum + f.totalAmount, 0);
    const totalPaid = feeBreakdown.reduce((sum, f) => sum + f.totalPaid, 0);
    const totalRemaining = totalOwed - totalPaid;

    // Fetch user's enrollment status
    const user = db.prepare('SELECT enrollment_status FROM users WHERE id = ?').get(userId);

    // Fetch any installment plans
    const installmentPlans = db.prepare(
      `SELECT * FROM installment_plans WHERE user_id = ? ORDER BY created_at DESC`
    ).all(userId);

    // Parse installments JSON for each plan
    const parsedPlans = installmentPlans.map(plan => ({
      ...plan,
      installments: JSON.parse(plan.installments_json)
    }));

    res.json({
      semester: '2025/2026 First Semester',
      enrollmentStatus: user.enrollment_status,
      feeBreakdown,
      totalOwed,
      totalPaid,
      totalRemaining,
      completionPercentage: totalOwed > 0 ? +((totalPaid / totalOwed) * 100).toFixed(1) : 0,
      exchangeRate: EXCHANGE_RATE,
      totalOwedUSDT: +(totalOwed / EXCHANGE_RATE).toFixed(2),
      totalPaidUSDT: +(totalPaid / EXCHANGE_RATE).toFixed(2),
      installmentPlans: parsedPlans
    });
  } catch (err) {
    console.error('[Payments] /balance error:', err.message);
    res.status(500).json({ error: 'Failed to fetch balance information.' });
  }
});

// ---------------------------------------------------------------------------
// POST /pay — Make a fee payment
// ---------------------------------------------------------------------------
router.post('/pay', async (req, res) => {
  try {
    const { feeType, amount } = req.body;

    // Validate input
    if (!feeType || !amount) {
      return res.status(400).json({ error: 'feeType and amount are required.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    // Simulate a 2-second "bank confirmation" delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Execute payment through the smart contract
    const result = TuitionPaymentContract.execute(db, blockchain, {
      userId: req.user.id,
      feeType,
      amount: parsedAmount
    });

    res.status(201).json({
      message: `Payment of ₦${parsedAmount.toLocaleString()} for ${feeType} confirmed.`,
      transaction: result.payment,
      block: {
        index: result.block.index,
        hash: result.block.hash,
        previousHash: result.block.previousHash,
        validator: result.block.validator,
        timestamp: result.block.timestamp
      },
      receipt: result.receipt
    });
  } catch (err) {
    console.error('[Payments] /pay error:', err.message);
    // Business logic errors (thrown by the contract) return 400
    if (err.message.includes('exceeds') || err.message.includes('fully paid') ||
        err.message.includes('Invalid fee') || err.message.includes('greater than')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Payment processing failed.' });
  }
});

// ---------------------------------------------------------------------------
// GET /history — Payment history for the logged-in user
// ---------------------------------------------------------------------------
router.get('/history', (req, res) => {
  try {
    const payments = db.prepare(
      `SELECT p.*, u.name as student_name, u.matric_number
       FROM payments p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`
    ).all(req.user.id);

    res.json({
      count: payments.length,
      payments
    });
  } catch (err) {
    console.error('[Payments] /history error:', err.message);
    res.status(500).json({ error: 'Failed to fetch payment history.' });
  }
});

// ---------------------------------------------------------------------------
// GET /receipt/:id — Detailed receipt for a single payment
// ---------------------------------------------------------------------------
router.get('/receipt/:id', (req, res) => {
  try {
    const paymentId = parseInt(req.params.id, 10);
    if (isNaN(paymentId)) {
      return res.status(400).json({ error: 'Invalid payment ID.' });
    }

    const payment = db.prepare(
      `SELECT p.*, u.name as student_name, u.matric_number, u.department, u.faculty, u.email
       FROM payments p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`
    ).get(paymentId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }

    // Students can only view their own receipts
    if (req.user.role === 'student' && payment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only view your own receipts.' });
    }

    // Fetch the corresponding block from the blockchain
    let blockInfo = null;
    if (payment.block_index !== null) {
      const block = blockchain.getBlock(payment.block_index);
      if (block) {
        blockInfo = {
          index: block.index,
          hash: block.hash,
          previousHash: block.previousHash,
          validator: block.validator,
          timestamp: block.timestamp,
          transactionCount: block.transactions ? block.transactions.length : 0
        };
      }
    }

    res.json({
      receipt: {
        paymentId: payment.id,
        receiptHash: payment.receipt_hash,
        studentName: payment.student_name,
        matricNumber: payment.matric_number,
        department: payment.department,
        faculty: payment.faculty,
        email: payment.email,
        feeType: payment.fee_type,
        amount: payment.amount,
        nairaAmount: payment.naira_amount,
        usdtEquivalent: payment.usdt_equivalent,
        status: payment.status,
        paymentMethod: payment.payment_method,
        gasFee: payment.gas_fee,
        txHash: payment.tx_hash,
        createdAt: payment.created_at
      },
      block: blockInfo,
      verification: {
        onChain: !!blockInfo,
        receiptIntegrity: !!payment.receipt_hash,
        blockchainConfirmed: payment.status === 'confirmed'
      }
    });
  } catch (err) {
    console.error('[Payments] /receipt error:', err.message);
    res.status(500).json({ error: 'Failed to fetch receipt.' });
  }
});

// ---------------------------------------------------------------------------
// POST /installment — Create an installment plan
// ---------------------------------------------------------------------------
router.post('/installment', (req, res) => {
  try {
    const { feeType, totalAmount } = req.body;

    if (!feeType) {
      return res.status(400).json({ error: 'feeType is required.' });
    }

    const plan = InstallmentContract.createPlan(db, {
      userId: req.user.id,
      feeType,
      totalAmount: totalAmount ? parseFloat(totalAmount) : undefined
    });

    res.status(201).json({
      message: `Installment plan created for ${feeType}.`,
      plan
    });
  } catch (err) {
    console.error('[Payments] /installment error:', err.message);
    if (err.message.includes('already exists') || err.message.includes('fully paid') || err.message.includes('Invalid fee')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create installment plan.' });
  }
});

// ---------------------------------------------------------------------------
// POST /installment/pay — Pay a specific installment
// ---------------------------------------------------------------------------
router.post('/installment/pay', async (req, res) => {
  try {
    const { planId, installmentIndex } = req.body;

    if (planId === undefined || installmentIndex === undefined) {
      return res.status(400).json({ error: 'planId and installmentIndex are required.' });
    }

    // Simulate bank confirmation delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = InstallmentContract.payInstallment(db, blockchain, {
      planId: parseInt(planId, 10),
      installmentIndex: parseInt(installmentIndex, 10)
    });

    res.status(201).json({
      message: 'Installment payment confirmed.',
      transaction: result.payment,
      block: {
        index: result.block.index,
        hash: result.block.hash,
        validator: result.block.validator
      },
      receipt: result.receipt,
      plan: result.plan
    });
  } catch (err) {
    console.error('[Payments] /installment/pay error:', err.message);
    if (err.message.includes('not found') || err.message.includes('already been paid') ||
        err.message.includes('must be paid')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Installment payment failed.' });
  }
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = router;
