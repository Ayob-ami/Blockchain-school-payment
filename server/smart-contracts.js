/**
 * ============================================================================
 * SMART CONTRACTS — Simulated On-Chain Business Logic
 * ============================================================================
 * Implements four contract classes that encode the payment system's rules:
 *
 *   • TuitionPaymentContract — process a fee payment, record on blockchain
 *   • InstallmentContract    — create / pay installment plans (50-30-20 split)
 *   • ReceiptContract        — generate tamper-proof receipts
 *   • RBACContract           — role-based access control checks
 *
 * CSC476 Group 16 — Blockchain-Based School Payment System
 * ============================================================================
 */

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const EXCHANGE_RATE = 1580;   // 1 USDT = ₦1,580 (fixed simulated rate)
const GAS_FEE_USD  = 0.05;   // Simulated L2 gas fee per transaction

// Required fees that must be fully paid to activate enrollment
const REQUIRED_FEES = ['Tuition', 'Library', 'Laboratory', 'ICT', 'Medical', 'Transport', 'Cafeteria'];

// ---------------------------------------------------------------------------
// RBAC Permission Map
// ---------------------------------------------------------------------------
const ROLE_PERMISSIONS = {
  student:   ['view_own_payments', 'make_payment', 'view_own_receipts', 'view_blockchain'],
  parent:    ['view_child_payments', 'make_payment', 'view_child_receipts', 'view_blockchain'],
  bursar:    ['view_all_payments', 'view_all_students', 'manage_fees', 'view_reconciliation', 'view_blockchain'],
  registrar: ['view_all_students', 'update_enrollment', 'manage_fees', 'view_blockchain'],
  auditor:   ['view_all_payments', 'view_all_students', 'view_reconciliation', 'view_blockchain', 'verify_chain']
};

// ---------------------------------------------------------------------------
// TuitionPaymentContract
// ---------------------------------------------------------------------------
class TuitionPaymentContract {
  /**
   * Execute a fee payment.
   *
   * Steps:
   *  1. Validate that the fee type exists and the amount doesn't exceed
   *     the remaining balance for this fee.
   *  2. Create a blockchain transaction and add it as a new block.
   *  3. Insert the payment record in the database.
   *  4. Generate a tamper-proof receipt.
   *  5. Check if all required fees are now fully paid — if so, update
   *     enrollment status to 'Active'.
   *
   * @param {object}     db         - better-sqlite3 database instance
   * @param {object}     blockchain - Blockchain singleton
   * @param {object}     params     - { userId, feeType, amount }
   * @returns {{ payment, block, receipt }}
   */
  static execute(db, blockchain, { userId, feeType, amount }) {
    // --- 1. Validation ---------------------------------------------------

    // Fetch the fee schedule for this fee type (current semester)
    const feeSchedule = db.prepare(
      `SELECT * FROM fee_schedules WHERE fee_type = ? ORDER BY id DESC LIMIT 1`
    ).get(feeType);

    if (!feeSchedule) {
      throw new Error(`Invalid fee type: "${feeType}". No matching fee schedule found.`);
    }

    // Calculate how much the student has already paid for this fee type
    const paidResult = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total_paid
       FROM payments
       WHERE user_id = ? AND fee_type = ? AND status = 'confirmed'`
    ).get(userId, feeType);

    const totalPaid = paidResult.total_paid;
    const remaining = feeSchedule.amount - totalPaid;

    if (remaining <= 0) {
      throw new Error(`Fee "${feeType}" is already fully paid.`);
    }

    if (amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    if (amount > remaining) {
      throw new Error(
        `Payment amount (₦${amount.toLocaleString()}) exceeds remaining balance (₦${remaining.toLocaleString()}) for ${feeType}.`
      );
    }

    // --- 2. Blockchain Transaction ---------------------------------------
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    const usdtEquivalent = +(amount / EXCHANGE_RATE).toFixed(2);
    const txData = {
      type: 'FEE_PAYMENT',
      from: user.wallet_address,
      to: '0x' + 'UniversityTreasury'.padEnd(40, '0').substring(0, 40),
      feeType: feeType,
      nairaAmount: amount,
      usdtEquivalent: usdtEquivalent,
      gasFee: GAS_FEE_USD,
      studentId: userId,
      studentName: user.name,
      matricNumber: user.matric_number,
      timestamp: new Date().toISOString()
    };

    const txHash = crypto.createHash('sha256')
      .update(JSON.stringify(txData) + Date.now() + Math.random())
      .digest('hex');

    txData.txHash = txHash;

    // Add block to chain
    const block = blockchain.addBlock([txData]);

    // --- 3. Receipt Generation -------------------------------------------
    const receipt = ReceiptContract.generateReceipt(
      { ...txData, amount, userId },
      block
    );

    // --- 4. Database Insert ----------------------------------------------
    const insertStmt = db.prepare(`
      INSERT INTO payments (user_id, fee_type, amount, naira_amount, usdt_equivalent,
                            status, block_index, tx_hash, receipt_hash, gas_fee)
      VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      userId, feeType, amount, amount, usdtEquivalent,
      block.index, txHash, receipt.receiptHash, GAS_FEE_USD
    );

    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);

    // --- 5. Enrollment Status Check --------------------------------------
    TuitionPaymentContract._checkEnrollmentStatus(db, userId);

    // --- 6. Audit Log ----------------------------------------------------
    db.prepare(`
      INSERT INTO audit_log (actor_id, action, details)
      VALUES (?, 'PAYMENT_MADE', ?)
    `).run(userId, JSON.stringify({
      feeType, amount, txHash: txHash.substring(0, 16), blockIndex: block.index
    }));

    return { payment, block, receipt };
  }

  /**
   * Check whether all required fees are fully paid and update enrollment.
   */
  static _checkEnrollmentStatus(db, userId) {
    const feeSchedules = db.prepare(
      `SELECT fee_type, amount FROM fee_schedules WHERE semester = '2025/2026 First Semester'`
    ).all();

    let allPaid = true;
    for (const fee of feeSchedules) {
      const paid = db.prepare(
        `SELECT COALESCE(SUM(amount), 0) as total_paid
         FROM payments
         WHERE user_id = ? AND fee_type = ? AND status = 'confirmed'`
      ).get(userId, fee.fee_type);

      if (paid.total_paid < fee.amount) {
        allPaid = false;
        break;
      }
    }

    if (allPaid) {
      db.prepare(`UPDATE users SET enrollment_status = 'Active' WHERE id = ?`).run(userId);
      console.log(`[Contract] ✓ User #${userId} enrollment activated — all fees paid.`);
    }
  }
}

// ---------------------------------------------------------------------------
// InstallmentContract
// ---------------------------------------------------------------------------
class InstallmentContract {
  /**
   * Create an installment plan that splits a fee into 3 parts:
   *   50% due immediately, 30% due in 30 days, 20% due in 60 days.
   *
   * @param {object} db     - database instance
   * @param {object} params - { userId, feeType, totalAmount }
   * @returns {object} the created installment plan
   */
  static createPlan(db, { userId, feeType, totalAmount }) {
    // Validate fee type
    const feeSchedule = db.prepare(
      `SELECT * FROM fee_schedules WHERE fee_type = ? ORDER BY id DESC LIMIT 1`
    ).get(feeType);

    if (!feeSchedule) {
      throw new Error(`Invalid fee type: "${feeType}".`);
    }

    // Check for existing active plan
    const existingPlan = db.prepare(
      `SELECT * FROM installment_plans WHERE user_id = ? AND fee_type = ?`
    ).get(userId, feeType);

    if (existingPlan) {
      throw new Error(`An installment plan already exists for ${feeType}.`);
    }

    // Calculate remaining balance
    const paidResult = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total_paid
       FROM payments WHERE user_id = ? AND fee_type = ? AND status = 'confirmed'`
    ).get(userId, feeType);

    const remaining = feeSchedule.amount - paidResult.total_paid;
    if (remaining <= 0) {
      throw new Error(`Fee "${feeType}" is already fully paid.`);
    }

    // Use the remaining amount (or totalAmount if less) for the plan
    const planAmount = Math.min(totalAmount, remaining);

    // Build installment schedule: 50%, 30%, 20%
    const now = new Date();
    const installments = [
      {
        index: 0,
        amount: +(planAmount * 0.50).toFixed(2),
        dueDate: now.toISOString().split('T')[0],
        status: 'pending',
        paidAt: null,
        paymentId: null
      },
      {
        index: 1,
        amount: +(planAmount * 0.30).toFixed(2),
        dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        paidAt: null,
        paymentId: null
      },
      {
        index: 2,
        amount: +(planAmount * 0.20).toFixed(2),
        dueDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        paidAt: null,
        paymentId: null
      }
    ];

    // Insert plan into database
    const result = db.prepare(`
      INSERT INTO installment_plans (user_id, fee_type, total_amount, installments_json)
      VALUES (?, ?, ?, ?)
    `).run(userId, feeType, planAmount, JSON.stringify(installments));

    const plan = db.prepare('SELECT * FROM installment_plans WHERE id = ?').get(result.lastInsertRowid);
    plan.installments = JSON.parse(plan.installments_json);

    console.log(`[Contract] ✓ Installment plan created for user #${userId} — ${feeType} (₦${planAmount})`);
    return plan;
  }

  /**
   * Pay a specific installment within a plan.
   *
   * @param {object} db         - database instance
   * @param {object} blockchain - Blockchain singleton
   * @param {object} params     - { planId, installmentIndex }
   * @returns {{ payment, block, receipt, plan }}
   */
  static payInstallment(db, blockchain, { planId, installmentIndex }) {
    const plan = db.prepare('SELECT * FROM installment_plans WHERE id = ?').get(planId);
    if (!plan) throw new Error('Installment plan not found.');

    const installments = JSON.parse(plan.installments_json);
    const installment = installments[installmentIndex];

    if (!installment) {
      throw new Error(`Installment index ${installmentIndex} not found in plan.`);
    }

    if (installment.status === 'paid') {
      throw new Error(`Installment #${installmentIndex} has already been paid.`);
    }

    // Ensure previous installments are paid first (sequential requirement)
    for (let i = 0; i < installmentIndex; i++) {
      if (installments[i].status !== 'paid') {
        throw new Error(`Installment #${i} must be paid before #${installmentIndex}.`);
      }
    }

    // Process the payment through TuitionPaymentContract
    const result = TuitionPaymentContract.execute(db, blockchain, {
      userId: plan.user_id,
      feeType: plan.fee_type,
      amount: installment.amount
    });

    // Update the installment status
    installment.status = 'paid';
    installment.paidAt = new Date().toISOString();
    installment.paymentId = result.payment.id;

    db.prepare('UPDATE installment_plans SET installments_json = ? WHERE id = ?')
      .run(JSON.stringify(installments), planId);

    const updatedPlan = db.prepare('SELECT * FROM installment_plans WHERE id = ?').get(planId);
    updatedPlan.installments = JSON.parse(updatedPlan.installments_json);

    return { ...result, plan: updatedPlan };
  }
}

// ---------------------------------------------------------------------------
// ReceiptContract
// ---------------------------------------------------------------------------
class ReceiptContract {
  /**
   * Generate a tamper-proof receipt by hashing payment + block data.
   * The receipt hash serves as a unique, verifiable identifier.
   *
   * @param {object} payment - payment/transaction data
   * @param {object} block   - the block containing this transaction
   * @returns {object} receipt object with hash and metadata
   */
  static generateReceipt(payment, block) {
    const receiptData = {
      paymentTxHash: payment.txHash,
      blockHash: block.hash,
      blockIndex: block.index,
      feeType: payment.feeType || payment.fee_type,
      amount: payment.nairaAmount || payment.amount,
      timestamp: block.timestamp,
      validator: block.validator
    };

    const receiptHash = crypto.createHash('sha256')
      .update(JSON.stringify(receiptData))
      .digest('hex');

    return {
      receiptHash,
      blockIndex: block.index,
      blockHash: block.hash,
      validator: block.validator,
      timestamp: block.timestamp,
      verified: true
    };
  }
}

// ---------------------------------------------------------------------------
// RBACContract — Role-Based Access Control
// ---------------------------------------------------------------------------
class RBACContract {
  /**
   * Check if a given role has permission to perform an action.
   *
   * @param {string} userRole - one of: student, parent, bursar, registrar, auditor
   * @param {string} action   - the permission string to check
   * @returns {boolean}
   */
  static checkPermission(userRole, action) {
    const permissions = ROLE_PERMISSIONS[userRole];
    if (!permissions) return false;
    return permissions.includes(action);
  }

  /**
   * Get all permissions for a role.
   *
   * @param {string} userRole
   * @returns {string[]}
   */
  static getPermissions(userRole) {
    return ROLE_PERMISSIONS[userRole] || [];
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  TuitionPaymentContract,
  InstallmentContract,
  ReceiptContract,
  RBACContract,
  EXCHANGE_RATE,
  GAS_FEE_USD,
  REQUIRED_FEES
};
