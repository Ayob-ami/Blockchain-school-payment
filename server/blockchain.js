/**
 * ============================================================================
 * BLOCKCHAIN ENGINE — Simulated Proof-of-Authority Blockchain
 * ============================================================================
 * A fully functional blockchain simulation with SHA-256 hashing, block
 * validation, and persistent storage via JSON file. Implements a Proof-of-
 * Authority (PoA) consensus model with three validator nodes.
 *
 * CSC476 Group 16 — Blockchain-Based School Payment System
 * ============================================================================
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Path to persist blockchain state between server restarts
const CHAIN_DATA_PATH = path.join(__dirname, 'blockchain_data.json');

// ---------------------------------------------------------------------------
// Block Class — represents a single block in the chain
// ---------------------------------------------------------------------------
class Block {
  /**
   * @param {number}   index         - Position in the chain (0 = genesis)
   * @param {string}   timestamp     - ISO 8601 timestamp of block creation
   * @param {Array}    transactions  - Array of transaction objects in this block
   * @param {string}   previousHash  - Hash of the preceding block
   * @param {string}   validator     - Name of the PoA validator that minted this block
   */
  constructor(index, timestamp, transactions, previousHash, validator) {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.validator = validator;
    this.nonce = Math.floor(Math.random() * 100000);
    this.hash = this.calculateHash();
  }

  /**
   * Compute SHA-256 hash of the block's contents.
   * Any modification to block data will produce a completely different hash,
   * making tampering immediately detectable.
   */
  calculateHash() {
    const data = this.index +
      this.timestamp +
      JSON.stringify(this.transactions) +
      this.previousHash +
      this.nonce;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

// ---------------------------------------------------------------------------
// Blockchain Class — the full chain with management methods
// ---------------------------------------------------------------------------
class Blockchain {
  constructor() {
    // Authorised validator nodes (simulating multi-party PoA network)
    this.validators = [
      'University Node',
      'Ministry of Education Node',
      'Partner Bank Node'
    ];
    this.pendingTransactions = [];

    // Load existing chain from disk or create fresh with genesis block
    this.chain = this._loadChain();
  }

  // -----------------------------------------------------------------------
  // Persistence — load / save chain to JSON file
  // -----------------------------------------------------------------------

  /**
   * Load chain state from blockchain_data.json. Returns an array of Block-like
   * plain objects. If the file doesn't exist, creates the genesis block.
   */
  _loadChain() {
    try {
      if (fs.existsSync(CHAIN_DATA_PATH)) {
        const raw = fs.readFileSync(CHAIN_DATA_PATH, 'utf-8');
        const data = JSON.parse(raw);
        console.log(`[Blockchain] Loaded ${data.length} blocks from disk.`);
        return data;
      }
    } catch (err) {
      console.error('[Blockchain] Failed to load chain data, creating fresh chain:', err.message);
    }

    // No persisted data — start with genesis block
    const genesis = this.createGenesisBlock();
    this._saveChain([genesis]);
    return [genesis];
  }

  /**
   * Persist the current chain to disk as a JSON file.
   */
  _saveChain(chain) {
    try {
      fs.writeFileSync(CHAIN_DATA_PATH, JSON.stringify(chain || this.chain, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Blockchain] Failed to save chain data:', err.message);
    }
  }

  // -----------------------------------------------------------------------
  // Core Methods
  // -----------------------------------------------------------------------

  /**
   * Create the genesis (first) block with index 0 and no previous hash.
   */
  createGenesisBlock() {
    return new Block(
      0,
      new Date('2025-01-01T00:00:00.000Z').toISOString(),
      [{ type: 'GENESIS', message: 'Blockchain-Based School Payment System — Genesis Block' }],
      '0'.repeat(64),
      'System'
    );
  }

  /**
   * Return the most recently added block.
   */
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Add a new block containing the given transactions.
   * Selects a random PoA validator and links to the previous block's hash.
   *
   * @param {Array} transactions - array of transaction objects
   * @returns {Block} the newly created block
   */
  addBlock(transactions) {
    const previousBlock = this.getLatestBlock();
    const validator = this.validators[Math.floor(Math.random() * this.validators.length)];
    const newBlock = new Block(
      previousBlock.index + 1,
      new Date().toISOString(),
      transactions,
      previousBlock.hash,
      validator
    );

    this.chain.push(newBlock);
    this._saveChain();
    console.log(`[Blockchain] ✓ Block #${newBlock.index} added by ${validator} — hash: ${newBlock.hash.substring(0, 16)}...`);
    return newBlock;
  }

  /**
   * Walk the entire chain and verify integrity:
   *  1. Each block's stored hash matches its recalculated hash.
   *  2. Each block's previousHash matches the preceding block's hash.
   *
   * @returns {{ valid: boolean, details: string }}
   */
  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      // Recalculate hash from block data
      const recalculated = crypto.createHash('sha256').update(
        current.index +
        current.timestamp +
        JSON.stringify(current.transactions) +
        current.previousHash +
        current.nonce
      ).digest('hex');

      if (current.hash !== recalculated) {
        return {
          valid: false,
          details: `Block #${current.index} has been tampered with. Expected hash ${recalculated} but found ${current.hash}.`
        };
      }

      if (current.previousHash !== previous.hash) {
        return {
          valid: false,
          details: `Block #${current.index} has a broken chain link. previousHash does not match Block #${previous.index} hash.`
        };
      }
    }

    return { valid: true, details: 'All blocks verified — chain integrity confirmed.' };
  }

  /**
   * Return the full chain.
   */
  getChain() {
    return this.chain;
  }

  /**
   * Return a single block by its index.
   * @param {number} index
   * @returns {Block|null}
   */
  getBlock(index) {
    if (index < 0 || index >= this.chain.length) return null;
    return this.chain[index];
  }
}

// ---------------------------------------------------------------------------
// Singleton Instance
// ---------------------------------------------------------------------------
const blockchain = new Blockchain();

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = { blockchain, Block, Blockchain };
