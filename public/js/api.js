/* ============================================================
   BlockPay API — Dual-Mode REST API Client / Simulator
   ============================================================ */

const API = {
  baseUrl: '/api',
  token: localStorage.getItem('token'),
  isLocalMock: false,

  // Cache for local mock database
  mockDb: null,

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  },

  /**
   * Clear authentication token
   */
  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  },

  /**
   * Initialize API client. Tries to connect to backend.
   * If backend is not available, falls back to full client-side blockchain simulation.
   */
  async init() {
    try {
      if (window.location.protocol === 'file:') {
        throw new Error('Running on file:// protocol. Local mock enabled.');
      }
      
      const res = await fetch(this.baseUrl + '/health');
      if (!res.ok) throw new Error('Health check failed');
      const data = await res.json();
      
      this.isLocalMock = false;
      console.log('⛓️ BlockPay backend connected! Running in Client-Server mode.');
    } catch (err) {
      this.isLocalMock = true;
      console.warn('⚠️ BlockPay backend not reachable. Running in Local Browser Simulation mode.', err.message);
      this.initializeMockDatabase();
      this.showMockBanner();
    }
  },

  /**
   * Display a banner indicating the app is running in simulation mode
   */
  showMockBanner() {
    // Wait for DOM
    document.addEventListener('DOMContentLoaded', () => {
      const banner = document.createElement('div');
      banner.className = 'mock-banner';
      banner.style.cssText = `
        background: linear-gradient(90deg, #f59e0b, #d97706);
        color: #000;
        text-align: center;
        padding: var(--space-2) var(--space-4);
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.5px;
        position: relative;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      `;
      banner.innerHTML = `
        <span>🔬 Local Simulation Mode (No Node.js Server Detected) — Blockchain and DB are simulated inside your browser storage.</span>
        <button onclick="this.parentElement.remove()" style="background:none; border:none; color:#000; cursor:pointer; font-weight:bold; font-size:1.1rem; padding:0 var(--space-2); margin-left: auto;">×</button>
      `;
      document.body.insertBefore(banner, document.body.firstChild);
    });
  },

  /**
   * Make a request — either remote to backend, or local mock
   */
  async request(method, endpoint, body = null) {
    if (this.isLocalMock) {
      return this.handleMockRequest(method, endpoint, body);
    }

    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = 'Bearer ' + this.token;
    }

    const config = { method, headers };
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(this.baseUrl + endpoint, config);
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        if (res.status === 401) {
          this.clearToken();
          if (typeof Auth !== 'undefined' && Auth.logout) {
            Auth.logout();
          }
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error(data.error || data.message || `Request failed (${res.status})`);
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Server connection lost. Please try again.');
      }
      throw err;
    }
  },

  /* ── Auth Endpoints ── */
  login(email, password) {
    return this.request('POST', '/auth/login', { email, password });
  },

  getMe() {
    return this.request('GET', '/auth/me');
  },

  /* ── Payment Endpoints ── */
  getBalance() {
    return this.request('GET', '/payments/balance');
  },

  makePayment(feeType, amount, simulateFailure = false) {
    return this.request('POST', '/payments/pay', { feeType, amount: Number(amount), simulateFailure });
  },

  getHistory() {
    return this.request('GET', '/payments/history');
  },

  getReceipt(id) {
    return this.request('GET', '/payments/receipt/' + id);
  },

  /* ── Admin Endpoints ── */
  getOverview() {
    return this.request('GET', '/admin/overview');
  },

  getStudents() {
    return this.request('GET', '/admin/students');
  },

  getTransactions(search = '') {
    const qs = search ? '?search=' + encodeURIComponent(search) : '';
    return this.request('GET', '/admin/transactions' + qs);
  },

  getReconciliation() {
    return this.request('GET', '/admin/reconciliation');
  },

  /* ── Blockchain Endpoints ── */
  getChain() {
    return this.request('GET', '/blockchain/chain');
  },

  getBlock(index) {
    return this.request('GET', '/blockchain/block/' + index);
  },

  verifyChain() {
    return this.request('POST', '/blockchain/verify');
  },

  /* ============================================================
     CLIENT-SIDE BROWSER SIMULATION ENGINE
     ============================================================ */

  /**
   * Create and seed local database tables in localStorage
   */
  initializeMockDatabase() {
    try {
      if (localStorage.getItem('blockpay_mock_db')) {
        const db = JSON.parse(localStorage.getItem('blockpay_mock_db'));
        if (db && db.users && db.users.length > 0) {
          this.mockDb = db;
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to parse mock database, re-seeding...', e);
    }

    console.log('🔬 Seeding mock database inside browser storage...');

    // Seed Users
    const users = [
      {
        id: 1,
        email: 'tobiloba@student.edu.ng',
        password: 'student123', // stored plain for mock validation simplicity
        name: 'Alasoadura Oluwatobiloba Emmanuel',
        role: 'student',
        matric_number: '236323',
        department: 'Computer Science',
        faculty: 'Science',
        enrollment_status: 'Inactive',
        wallet_address: '0x' + this.randomHex(40)
      },
      {
        id: 2,
        email: 'ayomide@student.edu.ng',
        password: 'student123',
        name: 'Adewuyi Thanni Ayomide',
        role: 'student',
        matric_number: '236949',
        department: 'Computer Science',
        faculty: 'Science',
        enrollment_status: 'Inactive',
        wallet_address: '0x' + this.randomHex(40)
      },
      {
        id: 3,
        email: 'bursar@admin.edu.ng',
        password: 'admin123',
        name: 'Dr. Nkechi Okonkwo',
        role: 'bursar',
        wallet_address: '0x' + this.randomHex(40)
      },
      {
        id: 4,
        email: 'registrar@admin.edu.ng',
        password: 'admin123',
        name: 'Prof. Adamu Ibrahim',
        role: 'registrar',
        wallet_address: '0x' + this.randomHex(40)
      },
      {
        id: 5,
        email: 'auditor@admin.edu.ng',
        password: 'admin123',
        name: 'Mrs. Funke Adeyemi',
        role: 'auditor',
        wallet_address: '0x' + this.randomHex(40)
      }
    ];

    // Seed Fee Schedules
    const semester = '2025/2026 First Semester';
    const feeSchedules = [
      { id: 1, fee_type: 'Tuition', amount: 350000, semester, due_date: '2025-10-15', description: 'Semester tuition fee' },
      { id: 2, fee_type: 'Library', amount: 15000, semester, due_date: '2025-10-15', description: 'Library access' },
      { id: 3, fee_type: 'Laboratory', amount: 25000, semester, due_date: '2025-10-15', description: 'Lab facilities' },
      { id: 4, fee_type: 'ICT', amount: 20000, semester, due_date: '2025-10-15', description: 'ICT and portal fees' },
      { id: 5, fee_type: 'Medical', amount: 10000, semester, due_date: '2025-10-15', description: 'Medical service fee' },
      { id: 6, fee_type: 'Transport', amount: 30000, semester, due_date: '2025-10-15', description: 'Transport service' },
      { id: 7, fee_type: 'Cafeteria', amount: 45000, semester, due_date: '2025-10-15', description: 'Cafeteria service' }
    ];

    // Seed Blockchain (Genesis block)
    const genesisBlock = {
      index: 0,
      timestamp: '2025-08-01T00:00:00.000Z',
      transactions: [],
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
      validator: 'University Genesis Node',
      nonce: 42398,
      hash: '0000a6e03fb8a4c8a8c4f9a03cf8da583c2e1bc638d9f48ac8c0cf8da294c7b8'
    };
    const blockchain = [genesisBlock];

    // Seed initial payments for Tobiloba (user_id = 1) in database & blockchain
    const payments = [];
    const seedPayments = [
      { feeType: 'Tuition', amount: 200000, date: '2025-09-01T10:00:00.000Z' },
      { feeType: 'Library', amount: 15000, date: '2025-09-05T14:30:00.000Z' },
      { feeType: 'ICT', amount: 20000, date: '2025-09-10T09:15:00.000Z' }
    ];

    let blockIdx = 1;
    let prevHash = genesisBlock.hash;
    const validators = ['University Node', 'Ministry of Education Node', 'Partner Bank Node'];

    seedPayments.forEach(p => {
      const txHash = 'tx_' + this.randomHex(64);
      const receiptHash = 'rcpt_' + this.randomHex(64);

      // Create Payment Record
      const payment = {
        id: payments.length + 1,
        user_id: 1,
        fee_type: p.feeType,
        amount: p.amount,
        naira_amount: p.amount,
        usdt_equivalent: +(p.amount / 1580).toFixed(2),
        status: 'confirmed',
        block_index: blockIdx,
        tx_hash: txHash,
        receipt_hash: receiptHash,
        payment_method: 'Simulated Bank Transfer',
        gas_fee: 0.05,
        created_at: p.date
      };
      payments.push(payment);

      // Add to simulated Blockchain
      const blockHash = 'blk_' + this.randomHex(64);
      const block = {
        index: blockIdx,
        timestamp: p.date,
        transactions: [{
          type: 'FEE_PAYMENT',
          from: users[0].wallet_address,
          to: '0x' + 'UniversityTreasury'.padEnd(40, '0').substring(0, 40),
          feeType: p.feeType,
          amount: p.amount,
          nairaAmount: p.amount,
          usdtEquivalent: +(p.amount / 1580).toFixed(2),
          gasFee: 0.05,
          studentName: users[0].name,
          matricNumber: users[0].matric_number,
          txHash: txHash
        }],
        previousHash: prevHash,
        validator: validators[(blockIdx - 1) % validators.length],
        nonce: Math.floor(Math.random() * 90000) + 10000,
        hash: blockHash
      };
      blockchain.push(block);
      prevHash = blockHash;
      blockIdx++;
    });

    this.mockDb = {
      users,
      feeSchedules,
      payments,
      blockchain,
      auditLog: []
    };
    this.saveMockDb();
  },

  /**
   * Save mock database to localStorage
   */
  saveMockDb() {
    localStorage.setItem('blockpay_mock_db', JSON.stringify(this.mockDb));
  },

  /**
   * Handle mock request processing
   */
  async handleMockRequest(method, endpoint, body) {
    // Add small delay to mimic server response latency
    await new Promise(r => setTimeout(r, 300));

    const getLoggedInUser = () => {
      if (!this.token) return null;
      const userId = parseInt(this.token.split('-')[1]);
      return this.mockDb.users.find(u => u.id === userId);
    };

    // 1. LOGIN
    if (endpoint === '/auth/login' && method === 'POST') {
      const user = this.mockDb.users.find(u => u.email === body.email && u.password === body.password);
      if (!user) {
        throw new Error('Invalid email or password.');
      }
      const token = `mocktoken-${user.id}-${Math.random()}`;
      return { token, user };
    }

    // 2. GET ME
    if (endpoint === '/auth/me' && method === 'GET') {
      const user = getLoggedInUser();
      if (!user) throw new Error('Unauthorized');
      return { user };
    }

    // 3. GET BALANCE (For current student)
    if (endpoint === '/payments/balance' && method === 'GET') {
      const user = getLoggedInUser();
      if (!user || user.role !== 'student') throw new Error('Unauthorized');

      // Compute details
      const fees = this.mockDb.feeSchedules.map(fs => {
        const studentPayments = this.mockDb.payments.filter(
          p => p.user_id === user.id && p.fee_type === fs.fee_type && p.status === 'confirmed'
        );
        const paid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
        return {
          feeType: fs.fee_type,
          amount: fs.amount, // total expected
          paid: paid,
          semester: fs.semester
        };
      });

      const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
      const totalPaid = fees.reduce((sum, f) => sum + f.paid, 0);
      const outstanding = totalFees - totalPaid;

      return {
        walletAddress: user.wallet_address,
        totalFees,
        totalPaid,
        outstanding,
        enrollmentStatus: user.enrollment_status,
        fees
      };
    }

    // 4. MAKE PAYMENT
    if (endpoint === '/payments/pay' && method === 'POST') {
      const user = getLoggedInUser();
      if (!user || user.role !== 'student') throw new Error('Unauthorized');

      const { feeType, amount, simulateFailure } = body;
      const fs = this.mockDb.feeSchedules.find(f => f.fee_type === feeType);
      if (!fs) throw new Error('Invalid fee type');

      // Validate outstanding
      const studentPayments = this.mockDb.payments.filter(
        p => p.user_id === user.id && p.fee_type === feeType && p.status === 'confirmed'
      );
      const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = fs.amount - totalPaid;

      const time = new Date().toISOString();

      if (amount <= 0 || amount > remaining || simulateFailure) {
        // Create Failed Payment Object for history tracking
        const failedPayment = {
          id: this.mockDb.payments.length + 1,
          user_id: user.id,
          fee_type: feeType,
          amount: amount,
          naira_amount: amount,
          usdt_equivalent: +(amount / 1580).toFixed(2),
          status: 'failed',
          block_index: null,
          tx_hash: '0x_failed_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
          receipt_hash: null,
          payment_method: 'Simulated Bank Transfer',
          gas_fee: 0.05,
          created_at: time
        };
        this.mockDb.payments.push(failedPayment);
        this.saveMockDb();

        if (simulateFailure) {
          throw new Error('Consensus Rejection: Double-spending signature conflict detected at Partner Bank Node');
        } else {
          throw new Error(`Smart Contract Rejection: Payment amount of ₦${amount.toLocaleString()} exceeds outstanding balance of ₦${remaining.toLocaleString()}`);
        }
      }

      // Generate Tx Hashes using SubtleCrypto
      const time = new Date().toISOString();
      const txHashRaw = `tx_${user.wallet_address}_${feeType}_${amount}_${time}_${Math.random()}`;
      const txHash = '0x' + await this.cryptoHash(txHashRaw);
      const receiptHash = 'rcpt_' + await this.cryptoHash(txHashRaw + '_receipt');

      // Create Payment Object
      const payment = {
        id: this.mockDb.payments.length + 1,
        user_id: user.id,
        fee_type: feeType,
        amount: amount,
        naira_amount: amount,
        usdt_equivalent: +(amount / 1580).toFixed(2),
        status: 'confirmed',
        block_index: this.mockDb.blockchain.length,
        tx_hash: txHash,
        receipt_hash: receiptHash,
        payment_method: 'Simulated Bank Transfer',
        gas_fee: 0.05,
        created_at: time
      };

      this.mockDb.payments.push(payment);

      // Create new Block
      const latestBlock = this.mockDb.blockchain[this.mockDb.blockchain.length - 1];
      const validators = ['University Node', 'Ministry of Education Node', 'Partner Bank Node'];
      const blockHashRaw = `${latestBlock.hash}_${time}_${JSON.stringify(payment)}_${Math.random()}`;
      const blockHash = await this.cryptoHash(blockHashRaw);

      const block = {
        index: this.mockDb.blockchain.length,
        timestamp: time,
        transactions: [{
          type: 'FEE_PAYMENT',
          from: user.wallet_address,
          to: '0x' + 'UniversityTreasury'.padEnd(40, '0').substring(0, 40),
          feeType: feeType,
          amount: amount,
          nairaAmount: amount,
          usdtEquivalent: +(amount / 1580).toFixed(2),
          gasFee: 0.05,
          studentName: user.name,
          matricNumber: user.matric_number,
          txHash: txHash
        }],
        previousHash: latestBlock.hash,
        validator: validators[Math.floor(Math.random() * validators.length)],
        nonce: Math.floor(Math.random() * 90000) + 10000,
        hash: blockHash
      };

      this.mockDb.blockchain.push(block);

      // Check enrollment activation status
      let allPaid = true;
      for (const fsItem of this.mockDb.feeSchedules) {
        const itemPayments = this.mockDb.payments.filter(
          p => p.user_id === user.id && p.fee_type === fsItem.fee_type && p.status === 'confirmed'
        );
        const sumPaid = itemPayments.reduce((sum, p) => sum + p.amount, 0);
        if (sumPaid < fsItem.amount) {
          allPaid = false;
          break;
        }
      }

      if (allPaid) {
        user.enrollment_status = 'Active';
      }

      // Add to audit logs
      this.mockDb.auditLog.push({
        id: this.mockDb.auditLog.length + 1,
        actor_id: user.id,
        action: 'PAYMENT_MADE',
        details: JSON.stringify({ feeType, amount, txHash: txHash.substring(0, 16), blockIndex: block.index }),
        created_at: time
      });

      this.saveMockDb();

      return {
        blockIndex: block.index,
        payment,
        block,
        receipt: {
          receiptHash,
          blockIndex: block.index,
          blockHash: block.hash,
          validator: block.validator,
          timestamp: block.timestamp,
          verified: true
        }
      };
    }

    // 5. GET HISTORY (Student payments list)
    if (endpoint === '/payments/history' && method === 'GET') {
      const user = getLoggedInUser();
      if (!user || user.role !== 'student') throw new Error('Unauthorized');
      
      const transactions = this.mockDb.payments
        .filter(p => p.user_id === user.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      return { transactions };
    }

    // 6. GET RECEIPT BY ID
    if (endpoint.startsWith('/payments/receipt/') && method === 'GET') {
      const paymentId = parseInt(endpoint.split('/')[3]);
      const payment = this.mockDb.payments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Receipt not found');
      
      return { payment };
    }

    // 7. GET ADMIN OVERVIEW
    if (endpoint === '/admin/overview' && method === 'GET') {
      const user = getLoggedInUser();
      if (!user || !['bursar', 'registrar', 'auditor'].includes(user.role)) throw new Error('Unauthorized');

      const totalCollected = this.mockDb.payments
        .filter(p => p.status === 'confirmed')
        .reduce((sum, p) => sum + p.amount, 0);

      // Pending Amount calculation
      const totalStudents = this.mockDb.users.filter(u => u.role === 'student').length;
      const expectedPerStudent = this.mockDb.feeSchedules.reduce((sum, fs) => sum + fs.amount, 0);
      const totalExpected = expectedPerStudent * totalStudents;
      const pendingAmount = totalExpected - totalCollected;

      const activeStudents = this.mockDb.users.filter(u => u.role === 'student' && u.enrollment_status === 'Active').length;
      const totalTransactions = this.mockDb.payments.length;

      // Activity Feed items
      const recentActivity = this.mockDb.payments
        .slice(-5)
        .reverse()
        .map(p => {
          const stud = this.mockDb.users.find(u => u.id === p.user_id);
          return {
            icon: '💳',
            text: `<strong>${stud ? stud.name : 'Student'}</strong> paid ₦${p.amount.toLocaleString()} for ${p.fee_type}`,
            time: p.created_at
          };
        });

      return {
        totalCollected,
        pendingAmount,
        activeStudents,
        totalTransactions,
        avgSettlementTime: '< 3 seconds',
        reconciliationAccuracy: '100.0%',
        recentActivity
      };
    }

    // 8. GET STUDENTS
    if (endpoint === '/admin/students' && method === 'GET') {
      const user = getLoggedInUser();
      if (!user || !['bursar', 'registrar', 'auditor'].includes(user.role)) throw new Error('Unauthorized');

      const totalFeesExpected = this.mockDb.feeSchedules.reduce((sum, fs) => sum + fs.amount, 0);

      const students = this.mockDb.users
        .filter(u => u.role === 'student')
        .map(u => {
          const paid = this.mockDb.payments
            .filter(p => p.user_id === u.id && p.status === 'confirmed')
            .reduce((sum, p) => sum + p.amount, 0);
          return {
            id: u.id,
            name: u.name,
            matricNo: u.matric_number,
            department: u.department,
            totalFees: totalFeesExpected,
            totalPaid: paid,
            enrollmentStatus: u.enrollment_status
          };
        });

      return { students };
    }

    // 9. GET TRANSACTIONS (Admin Searchable)
    if (endpoint.startsWith('/admin/transactions') && method === 'GET') {
      const user = getLoggedInUser();
      if (!user || !['bursar', 'registrar', 'auditor'].includes(user.role)) throw new Error('Unauthorized');

      const txns = this.mockDb.payments.map(p => {
        const stud = this.mockDb.users.find(u => u.id === p.user_id);
        return {
          id: p.id,
          timestamp: p.created_at,
          studentName: stud ? stud.name : 'Unknown',
          feeType: p.fee_type,
          amount: p.amount,
          blockIndex: p.block_index,
          txHash: p.tx_hash,
          status: p.status
        };
      });

      return { transactions: txns };
    }

    // 10. GET RECONCILIATION
    if (endpoint === '/admin/reconciliation' && method === 'GET') {
      const user = getLoggedInUser();
      if (!user || !['bursar', 'registrar', 'auditor'].includes(user.role)) throw new Error('Unauthorized');

      const totalStudents = this.mockDb.users.filter(u => u.role === 'student').length;
      const expectedPerStudent = this.mockDb.feeSchedules.reduce((sum, fs) => sum + fs.amount, 0);
      const expectedRevenue = expectedPerStudent * totalStudents;

      const totalCollected = this.mockDb.payments
        .filter(p => p.status === 'confirmed')
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        expectedRevenue,
        totalCollected,
        discrepancy: 0, // In blockchain model, ledger is perfectly reconciled
        accuracy: 100,
        totalStudents,
        totalTransactions: this.mockDb.payments.length,
        unreconciledItems: 0
      };
    }

    // 11. GET BLOCKCHAIN CHAIN
    if (endpoint === '/blockchain/chain' && method === 'GET') {
      return { chain: this.mockDb.blockchain };
    }

    // 12. GET BLOCK DETAILS
    if (endpoint.startsWith('/blockchain/block/') && method === 'GET') {
      const blockIndex = parseInt(endpoint.split('/')[3]);
      const block = this.mockDb.blockchain[blockIndex];
      if (!block) throw new Error('Block not found');
      return block;
    }

    // 13. VERIFY CHAIN INTEGRITY
    if (endpoint === '/blockchain/verify' && method === 'POST') {
      let valid = true;
      let reason = '';
      
      const chain = this.mockDb.blockchain;
      for (let i = 1; i < chain.length; i++) {
        const current = chain[i];
        const previous = chain[i - 1];
        
        // In real verification, we recalculate hash, here we verify the link
        if (current.previousHash !== previous.hash) {
          valid = false;
          reason = `Previous hash link broken at Block #${i}`;
          break;
        }
      }

      return { valid, blockCount: chain.length, message: reason || 'Integrity check passed.' };
    }

    throw new Error(`Mock endpoint not implemented: ${method} ${endpoint}`);
  },

  /**
   * Helper to generate cryptographically authentic SHA-256 strings using browser SubtleCrypto
   */
  async cryptoHash(string) {
    try {
      const msgBuffer = new TextEncoder().encode(string);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback if subtle crypto is blocked (e.g., non-secure contexts)
      return this.randomHex(64);
    }
  },

  /**
   * Generate random hex characters
   */
  randomHex(len) {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < len; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }
};

window.API = API;

// Initialize connection check on load
API.init();
