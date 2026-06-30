/**
 * ============================================================================
 * EXPRESS SERVER — Main Entry Point
 * ============================================================================
 * Initializes the Express application, mounts all route modules, and starts
 * the HTTP server. On startup, the database is initialized (tables created,
 * seed data inserted) and the blockchain engine is loaded.
 *
 * CSC476 Group 16 — Blockchain-Based School Payment System
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// ---------------------------------------------------------------------------
// Initialize core services
// ---------------------------------------------------------------------------
const { db, initializeDatabase } = require('./database');
const { blockchain } = require('./blockchain');

// ---------------------------------------------------------------------------
// Import route modules
// ---------------------------------------------------------------------------
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const blockchainRoutes = require('./routes/blockchain');

// ---------------------------------------------------------------------------
// Create Express app
// ---------------------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Global Middleware
// ---------------------------------------------------------------------------

// Enable CORS for all origins (appropriate for a research/demo project)
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public/ directory (frontend assets)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Request logging middleware (simple, for development visibility)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// ---------------------------------------------------------------------------
// Mount API Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/blockchain', blockchainRoutes);

// ---------------------------------------------------------------------------
// Health Check Endpoint
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  const chainValidation = blockchain.isChainValid();
  res.json({
    status: 'online',
    service: 'Blockchain-Based School Payment System',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: 'connected',
    blockchain: {
      blocks: blockchain.getChain().length,
      valid: chainValidation.valid
    }
  });
});

// ---------------------------------------------------------------------------
// Catch-all: serve index.html for SPA client-side routing
// ---------------------------------------------------------------------------
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If public/index.html doesn't exist yet, return a helpful message
      res.status(200).json({
        message: 'Blockchain School Payment System API is running.',
        api: {
          auth: '/api/auth/login (POST), /api/auth/me (GET)',
          payments: '/api/payments/balance, /api/payments/pay, /api/payments/history, /api/payments/receipt/:id',
          admin: '/api/admin/overview, /api/admin/students, /api/admin/transactions, /api/admin/reconciliation',
          blockchain: '/api/blockchain/chain, /api/blockchain/block/:index, /api/blockchain/verify'
        }
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Global Error Handling Middleware
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err.stack || err.message);

  // Don't leak stack traces in production
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error.',
    ...(isDev && { stack: err.stack })
  });
});

// ---------------------------------------------------------------------------
// Startup Sequence
// ---------------------------------------------------------------------------
function startServer() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Blockchain-Based School Payment System — CSC476        ║');
  console.log('║  Group 16 Research Project                              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // 1. Initialize database (create tables + seed if needed)
  initializeDatabase();
  console.log('');

  // 2. Verify blockchain integrity on startup
  const validation = blockchain.isChainValid();
  console.log(`[Blockchain] Chain has ${blockchain.getChain().length} blocks.`);
  console.log(`[Blockchain] Integrity check: ${validation.valid ? '✓ VALID' : '✗ INVALID — ' + validation.details}`);
  console.log('');

  // 3. Seed blockchain with blocks for pre-seeded payments (if chain only has genesis)
  if (blockchain.getChain().length === 1) {
    console.log('[Blockchain] Seeding blocks for pre-existing payments...');
    const payments = db.prepare('SELECT * FROM payments ORDER BY id').all();
    for (const payment of payments) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payment.user_id);
      blockchain.addBlock([{
        type: 'FEE_PAYMENT',
        from: user ? user.wallet_address : 'unknown',
        to: '0x' + 'UniversityTreasury'.padEnd(40, '0').substring(0, 40),
        feeType: payment.fee_type,
        nairaAmount: payment.amount,
        txHash: payment.tx_hash,
        studentName: user ? user.name : 'Unknown',
        timestamp: payment.created_at
      }]);
    }
    console.log('[Blockchain] ✓ Seed blocks created.');
    console.log('');
  }

  // 4. Start HTTP server
  app.listen(PORT, () => {
    console.log(`[Server] ✓ Listening on http://localhost:${PORT}`);
    console.log(`[Server] ✓ API base path: http://localhost:${PORT}/api`);
    console.log('');
    console.log('Demo accounts:');
    console.log('  Student:   tobiloba@student.edu.ng / student123');
    console.log('  Student:   ayomide@student.edu.ng  / student123');
    console.log('  Bursar:    bursar@admin.edu.ng     / admin123');
    console.log('  Registrar: registrar@admin.edu.ng  / admin123');
    console.log('  Auditor:   auditor@admin.edu.ng    / admin123');
    console.log('');
  });
}

// Run the server
startServer();

// ---------------------------------------------------------------------------
// Exports (for testing purposes)
// ---------------------------------------------------------------------------
module.exports = app;
