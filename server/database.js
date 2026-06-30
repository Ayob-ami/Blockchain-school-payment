/**
 * ============================================================================
 * DATABASE MODULE — SQLite via better-sqlite3
 * ============================================================================
 * Handles database initialization, schema creation, and seed data for the
 * Blockchain-Based School Payment System (CSC476 Group 16).
 *
 * Tables: users, fee_schedules, payments, installment_plans, audit_log
 * ============================================================================
 */

const Database = require('better-sqlite3');
const bcryptjs = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

// ---------------------------------------------------------------------------
// Database Connection
// ---------------------------------------------------------------------------
const DB_PATH = path.join(__dirname, 'school_payments.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
// Enable foreign key enforcement
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Helper — generate a random simulated wallet address (0x + 40 hex chars)
// ---------------------------------------------------------------------------
function generateWalletAddress() {
  return '0x' + crypto.randomBytes(20).toString('hex');
}

// ---------------------------------------------------------------------------
// Schema Creation
// ---------------------------------------------------------------------------
function createTables() {
  db.exec(`
    -- Users table: students, parents, and admin roles
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'parent', 'bursar', 'registrar', 'auditor')),
      matric_number TEXT,
      department TEXT,
      faculty TEXT,
      enrollment_status TEXT DEFAULT 'Inactive' CHECK(enrollment_status IN ('Active', 'Inactive', 'Suspended')),
      wallet_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Fee schedules: defines what fees exist per semester
    CREATE TABLE IF NOT EXISTS fee_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fee_type TEXT NOT NULL,
      amount REAL NOT NULL,
      semester TEXT NOT NULL,
      due_date TEXT,
      description TEXT
    );

    -- Payments: every payment transaction recorded on-chain
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      fee_type TEXT NOT NULL,
      amount REAL NOT NULL,
      naira_amount REAL NOT NULL,
      usdt_equivalent REAL,
      status TEXT DEFAULT 'confirmed' CHECK(status IN ('pending', 'confirmed', 'failed')),
      block_index INTEGER,
      tx_hash TEXT,
      receipt_hash TEXT,
      payment_method TEXT DEFAULT 'Simulated Bank Transfer',
      gas_fee REAL DEFAULT 0.05,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Installment plans: allows students to pay in parts
    CREATE TABLE IF NOT EXISTS installment_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      fee_type TEXT NOT NULL,
      total_amount REAL NOT NULL,
      installments_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Audit log: tracks every administrative action for transparency
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------
function seedDatabase() {
  // Check if users already exist — skip seeding if so
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers.count > 0) {
    console.log('[DB] Seed data already present — skipping.');
    return;
  }

  console.log('[DB] Seeding database with demo data...');

  // ------ 1. Demo Users --------------------------------------------------
  const studentPasswordHash = bcryptjs.hashSync('student123', 10);
  const adminPasswordHash = bcryptjs.hashSync('admin123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (email, password, name, role, matric_number, department, faculty, wallet_address)
    VALUES (@email, @password, @name, @role, @matric_number, @department, @faculty, @wallet_address)
  `);

  const users = [
    {
      email: 'tobiloba@student.edu.ng',
      password: studentPasswordHash,
      name: 'Alasoadura Oluwatobiloba Emmanuel',
      role: 'student',
      matric_number: '236323',
      department: 'Computer Science',
      faculty: 'Science',
      wallet_address: generateWalletAddress()
    },
    {
      email: 'ayomide@student.edu.ng',
      password: studentPasswordHash,
      name: 'Adewuyi Thanni Ayomide',
      role: 'student',
      matric_number: '236949',
      department: 'Computer Science',
      faculty: 'Science',
      wallet_address: generateWalletAddress()
    },
    {
      email: 'bursar@admin.edu.ng',
      password: adminPasswordHash,
      name: 'Dr. Nkechi Okonkwo',
      role: 'bursar',
      matric_number: null,
      department: null,
      faculty: null,
      wallet_address: generateWalletAddress()
    },
    {
      email: 'registrar@admin.edu.ng',
      password: adminPasswordHash,
      name: 'Prof. Adamu Ibrahim',
      role: 'registrar',
      matric_number: null,
      department: null,
      faculty: null,
      wallet_address: generateWalletAddress()
    },
    {
      email: 'auditor@admin.edu.ng',
      password: adminPasswordHash,
      name: 'Mrs. Funke Adeyemi',
      role: 'auditor',
      matric_number: null,
      department: null,
      faculty: null,
      wallet_address: generateWalletAddress()
    }
  ];

  const insertUsersTransaction = db.transaction(() => {
    for (const user of users) {
      insertUser.run(user);
    }
  });
  insertUsersTransaction();
  console.log('[DB] ✓ 5 demo users created.');

  // ------ 2. Fee Schedules ------------------------------------------------
  const semester = '2025/2026 First Semester';
  const insertFee = db.prepare(`
    INSERT INTO fee_schedules (fee_type, amount, semester, due_date, description)
    VALUES (@fee_type, @amount, @semester, @due_date, @description)
  `);

  const fees = [
    { fee_type: 'Tuition',    amount: 350000, semester, due_date: '2025-10-15', description: 'Semester tuition fee' },
    { fee_type: 'Library',    amount: 15000,  semester, due_date: '2025-10-15', description: 'Library access and resources' },
    { fee_type: 'Laboratory', amount: 25000,  semester, due_date: '2025-10-15', description: 'Lab equipment and materials' },
    { fee_type: 'ICT',        amount: 20000,  semester, due_date: '2025-10-15', description: 'ICT infrastructure and services' },
    { fee_type: 'Medical',    amount: 10000,  semester, due_date: '2025-10-15', description: 'Student health services' },
    { fee_type: 'Transport',  amount: 30000,  semester, due_date: '2025-10-15', description: 'Campus shuttle service' },
    { fee_type: 'Cafeteria',  amount: 45000,  semester, due_date: '2025-10-15', description: 'Meal plan and cafeteria access' }
  ];

  const insertFeesTransaction = db.transaction(() => {
    for (const fee of fees) {
      insertFee.run(fee);
    }
  });
  insertFeesTransaction();
  console.log('[DB] ✓ 7 fee schedules created.');

  // ------ 3. Pre-seeded Payments for Tobiloba (user_id = 1) ---------------
  // These will be matched with blockchain blocks created in blockchain.js init
  const EXCHANGE_RATE = 1580; // 1 USDT = ₦1,580

  const insertPayment = db.prepare(`
    INSERT INTO payments (user_id, fee_type, amount, naira_amount, usdt_equivalent, status, block_index, tx_hash, receipt_hash, gas_fee, created_at)
    VALUES (@user_id, @fee_type, @amount, @naira_amount, @usdt_equivalent, @status, @block_index, @tx_hash, @receipt_hash, @gas_fee, @created_at)
  `);

  const seedPayments = [
    {
      user_id: 1,
      fee_type: 'Tuition',
      amount: 200000,
      naira_amount: 200000,
      usdt_equivalent: +(200000 / EXCHANGE_RATE).toFixed(2),
      status: 'confirmed',
      block_index: 1,
      tx_hash: crypto.createHash('sha256').update('seed-tx-tuition-partial-' + Date.now()).digest('hex'),
      receipt_hash: crypto.createHash('sha256').update('receipt-tuition-partial-' + Date.now()).digest('hex'),
      gas_fee: 0.05,
      created_at: '2025-09-01 10:00:00'
    },
    {
      user_id: 1,
      fee_type: 'Library',
      amount: 15000,
      naira_amount: 15000,
      usdt_equivalent: +(15000 / EXCHANGE_RATE).toFixed(2),
      status: 'confirmed',
      block_index: 2,
      tx_hash: crypto.createHash('sha256').update('seed-tx-library-' + Date.now()).digest('hex'),
      receipt_hash: crypto.createHash('sha256').update('receipt-library-' + Date.now()).digest('hex'),
      gas_fee: 0.05,
      created_at: '2025-09-05 14:30:00'
    },
    {
      user_id: 1,
      fee_type: 'ICT',
      amount: 20000,
      naira_amount: 20000,
      usdt_equivalent: +(20000 / EXCHANGE_RATE).toFixed(2),
      status: 'confirmed',
      block_index: 3,
      tx_hash: crypto.createHash('sha256').update('seed-tx-ict-' + Date.now()).digest('hex'),
      receipt_hash: crypto.createHash('sha256').update('receipt-ict-' + Date.now()).digest('hex'),
      gas_fee: 0.05,
      created_at: '2025-09-10 09:15:00'
    }
  ];

  const insertPaymentsTransaction = db.transaction(() => {
    for (const payment of seedPayments) {
      insertPayment.run(payment);
    }
  });
  insertPaymentsTransaction();
  console.log('[DB] ✓ 3 seed payments created for Tobiloba.');
}

// ---------------------------------------------------------------------------
// Initialization — called on server startup
// ---------------------------------------------------------------------------
function initializeDatabase() {
  console.log('[DB] Initializing database at', DB_PATH);
  createTables();
  seedDatabase();
  console.log('[DB] ✓ Database ready.');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = { db, initializeDatabase };
