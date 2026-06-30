/**
 * ============================================================================
 * BLOCKCHAIN ROUTES — Chain Inspection & Verification
 * ============================================================================
 * Exposes the simulated blockchain for transparency and auditing.
 *
 * GET  /chain        — return the full blockchain (all blocks)
 * GET  /block/:index — return a single block by index
 * POST /verify       — validate chain integrity (hash verification)
 *
 * CSC476 Group 16 — Blockchain-Based School Payment System
 * ============================================================================
 */

const express = require('express');
const { blockchain } = require('../blockchain');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All blockchain routes require authentication
router.use(authenticateToken);

// ---------------------------------------------------------------------------
// GET /chain — Return the full blockchain
// ---------------------------------------------------------------------------
router.get('/chain', (req, res) => {
  try {
    const chain = blockchain.getChain();

    res.json({
      blockCount: chain.length,
      validators: blockchain.validators,
      chain: chain.map(block => ({
        index: block.index,
        timestamp: block.timestamp,
        hash: block.hash,
        previousHash: block.previousHash,
        validator: block.validator,
        nonce: block.nonce,
        transactionCount: block.transactions ? block.transactions.length : 0,
        transactions: block.transactions
      }))
    });
  } catch (err) {
    console.error('[Blockchain] /chain error:', err.message);
    res.status(500).json({ error: 'Failed to fetch blockchain data.' });
  }
});

// ---------------------------------------------------------------------------
// GET /block/:index — Return a single block by its index
// ---------------------------------------------------------------------------
router.get('/block/:index', (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);

    if (isNaN(index) || index < 0) {
      return res.status(400).json({ error: 'Block index must be a non-negative integer.' });
    }

    const block = blockchain.getBlock(index);

    if (!block) {
      return res.status(404).json({
        error: `Block #${index} not found. Chain length: ${blockchain.getChain().length}.`
      });
    }

    // Fetch related payments from the database for richer context
    const { db } = require('../database');
    const relatedPayments = db.prepare(
      `SELECT p.id, p.user_id, p.fee_type, p.amount, p.tx_hash, p.status, u.name as student_name
       FROM payments p
       JOIN users u ON p.user_id = u.id
       WHERE p.block_index = ?`
    ).all(index);

    res.json({
      block: {
        index: block.index,
        timestamp: block.timestamp,
        hash: block.hash,
        previousHash: block.previousHash,
        validator: block.validator,
        nonce: block.nonce,
        transactionCount: block.transactions ? block.transactions.length : 0,
        transactions: block.transactions
      },
      relatedPayments,
      navigation: {
        previousBlock: index > 0 ? index - 1 : null,
        nextBlock: index < blockchain.getChain().length - 1 ? index + 1 : null
      }
    });
  } catch (err) {
    console.error('[Blockchain] /block error:', err.message);
    res.status(500).json({ error: 'Failed to fetch block data.' });
  }
});

// ---------------------------------------------------------------------------
// POST /verify — Validate the entire blockchain's integrity
// ---------------------------------------------------------------------------
router.post('/verify', (req, res) => {
  try {
    const result = blockchain.isChainValid();
    const chain = blockchain.getChain();

    res.json({
      valid: result.valid,
      blockCount: chain.length,
      details: result.details,
      validators: blockchain.validators,
      genesisBlock: {
        hash: chain[0].hash,
        timestamp: chain[0].timestamp
      },
      latestBlock: {
        index: chain[chain.length - 1].index,
        hash: chain[chain.length - 1].hash,
        timestamp: chain[chain.length - 1].timestamp,
        validator: chain[chain.length - 1].validator
      },
      verifiedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Blockchain] /verify error:', err.message);
    res.status(500).json({ error: 'Blockchain verification failed.' });
  }
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = router;
