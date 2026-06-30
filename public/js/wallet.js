/* ============================================================
   BlockPay Wallet — Student Wallet & Payment Logic
   ============================================================ */

const Wallet = {
  balanceData: null,

  /**
   * Load the student dashboard
   */
  async loadDashboard() {
    try {
      // Show loading skeletons
      Utils.showLoading('fee-breakdown-list');
      Utils.showLoading('recent-transactions');

      // Fetch balance data
      const data = await API.getBalance();
      this.balanceData = data;

      // Update wallet address
      const walletEl = document.getElementById('wallet-address');
      if (walletEl) {
        walletEl.textContent = Utils.truncateHash(data.walletAddress || data.wallet_address || '0x0000...0000', 10);
        walletEl.title = data.walletAddress || data.wallet_address || '';
        walletEl.onclick = () => Utils.copyToClipboard(data.walletAddress || data.wallet_address || '');
      }

      // Update stat cards
      const totalFees = data.totalFees || data.total_fees || 0;
      const totalPaid = data.totalPaid || data.total_paid || 0;
      const outstanding = data.outstanding || (totalFees - totalPaid) || 0;
      const enrollment = data.enrollmentStatus || data.enrollment_status || 'Inactive';

      this.animateValue('stat-total-fees', totalFees);
      this.animateValue('stat-total-paid', totalPaid);
      this.animateValue('stat-outstanding', outstanding);

      const enrollEl = document.getElementById('stat-enrollment');
      if (enrollEl) {
        enrollEl.textContent = enrollment;
        enrollEl.style.color = enrollment.toLowerCase() === 'active'
          ? 'var(--color-success)'
          : 'var(--color-warning)';
      }

      // Update enrollment badge
      const badgeEl = document.getElementById('enrollment-badge');
      if (badgeEl) {
        badgeEl.style.background = enrollment.toLowerCase() === 'active'
          ? 'linear-gradient(135deg, #10b981, #059669)'
          : 'linear-gradient(135deg, #f59e0b, #d97706)';
      }

      // Render fee breakdown
      this.renderFeeBreakdown(data.fees || data.feeBreakdown || data.fee_breakdown || []);

      // Load recent transactions
      await this.loadRecentTransactions();

    } catch (err) {
      Utils.showNotification(err.message || 'Failed to load dashboard', 'error');
    }
  },

  /**
   * Animate a stat value counting up
   */
  animateValue(elementId, targetValue) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const duration = 1000;
    const start = performance.now();
    const startVal = 0;

    function update(timestamp) {
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (targetValue - startVal) * eased;
      el.textContent = Utils.formatNaira(Math.round(current));
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  },

  /**
   * Render fee breakdown with progress bars
   */
  renderFeeBreakdown(fees) {
    const container = document.getElementById('fee-breakdown-list');
    if (!container) return;

    if (!fees || fees.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h4>No Fee Information</h4>
          <p>Fee breakdown will appear here once assigned.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = fees.map(fee => {
      const total = fee.amount || fee.total || 0;
      const paid = fee.paid || 0;
      const remaining = total - paid;
      const pct = Utils.percentage(paid, total);
      const isComplete = pct >= 100;

      return `
        <div class="fee-item">
          <div class="fee-item-header">
            <span class="fee-item-name">${Utils.escapeHtml(Utils.formatFeeType(fee.feeType || fee.fee_type || fee.name || ''))}</span>
            <span class="fee-item-amounts">
              ${Utils.formatNaira(paid)} / ${Utils.formatNaira(total)}
              ${isComplete ? ' ✅' : ''}
            </span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${isComplete ? 'success' : ''}" style="width: ${pct}%"></div>
          </div>
          <div class="progress-text">
            <span>${pct}% paid</span>
            <span>${remaining > 0 ? Utils.formatNaira(remaining) + ' remaining' : 'Fully paid'}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Load recent transactions (last 5)
   */
  async loadRecentTransactions() {
    try {
      const data = await API.getHistory();
      const transactions = (data.transactions || data.payments || data || []).slice(0, 5);

      const container = document.getElementById('recent-transactions');
      if (!container) return;

      if (transactions.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"></div>
            <h4>No Transactions Yet</h4>
            <p>Your payment history will appear here.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Fee Type</th>
                <th>Amount</th>
                <th>Block #</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(tx => `
                <tr>
                  <td>${Utils.formatDate(tx.timestamp || tx.date || tx.createdAt || tx.created_at)}</td>
                  <td>${Utils.escapeHtml(Utils.formatFeeType(tx.feeType || tx.fee_type || ''))}</td>
                  <td class="col-amount">${Utils.formatNaira(tx.amount)}</td>
                  <td><span class="badge badge-info">#${tx.blockIndex ?? tx.block_index ?? tx.blockNumber ?? '—'}</span></td>
                  <td>${Utils.statusBadge(tx.status || 'confirmed')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      const container = document.getElementById('recent-transactions');
      if (container) {
        container.innerHTML = `<p class="text-muted text-center p-4">Unable to load transactions.</p>`;
      }
    }
  },

  /**
   * Load the Make Payment page
   */
  async loadPaymentPage() {
    try {
      // Fetch balance for fee types
      const data = await API.getBalance();
      this.balanceData = data;

      const fees = data.fees || data.feeBreakdown || data.fee_breakdown || [];
      const select = document.getElementById('payment-fee-type');
      const amountInput = document.getElementById('payment-amount');
      const usdtInput = document.getElementById('payment-usdt');
      const hintEl = document.getElementById('payment-hint');

      if (select) {
        select.innerHTML = '<option value="">Select fee type...</option>';
        fees.forEach(fee => {
          const total = fee.amount || fee.total || 0;
          const paid = fee.paid || 0;
          const remaining = total - paid;
          if (remaining > 0) {
            const name = fee.feeType || fee.fee_type || fee.name || '';
            const option = document.createElement('option');
            option.value = name;
            option.textContent = `${Utils.formatFeeType(name)} (${Utils.formatNaira(remaining)} remaining)`;
            option.dataset.remaining = remaining;
            select.appendChild(option);
          }
        });

        // On fee type change
        select.addEventListener('change', () => {
          const option = select.options[select.selectedIndex];
          const remaining = parseFloat(option?.dataset?.remaining || 0);
          if (hintEl) {
            hintEl.textContent = remaining > 0 ? `Remaining balance: ${Utils.formatNaira(remaining)}` : '';
          }
          if (amountInput && remaining > 0) {
            amountInput.max = remaining;
            amountInput.placeholder = `Max: ${Utils.formatNaira(remaining)}`;
          }
        });
      }

      // On amount change → compute USDT
      if (amountInput) {
        amountInput.addEventListener('input', () => {
          const amount = parseFloat(amountInput.value) || 0;
          if (usdtInput) {
            usdtInput.value = amount > 0 ? `≈ ${Utils.formatUSDT(amount)}` : '';
          }
        });
      }

      // Bind form submit
      const form = document.getElementById('payment-form');
      if (form) {
        // Remove existing listener by cloning
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        // Re-bind select and input listeners on new form
        const newSelect = newForm.querySelector('#payment-fee-type');
        const newAmount = newForm.querySelector('#payment-amount');
        const newUsdt = newForm.querySelector('#payment-usdt');
        const newHint = newForm.querySelector('#payment-hint');

        if (newSelect) {
          newSelect.innerHTML = select.innerHTML;
          newSelect.addEventListener('change', () => {
            const option = newSelect.options[newSelect.selectedIndex];
            const remaining = parseFloat(option?.dataset?.remaining || 0);
            if (newHint) {
              newHint.textContent = remaining > 0 ? `Remaining balance: ${Utils.formatNaira(remaining)}` : '';
            }
            if (newAmount && remaining > 0) {
              newAmount.max = remaining;
              newAmount.placeholder = `Max: ${Utils.formatNaira(remaining)}`;
            }
          });
        }

        if (newAmount) {
          newAmount.addEventListener('input', () => {
            const amount = parseFloat(newAmount.value) || 0;
            if (newUsdt) {
              newUsdt.value = amount > 0 ? `≈ ${Utils.formatUSDT(amount)}` : '';
            }
          });
        }

        newForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const feeType = newSelect?.value;
          const amount = parseFloat(newAmount?.value);

          if (!feeType) {
            Utils.showNotification('Please select a fee type.', 'warning');
            return;
          }
          if (!amount || amount <= 0) {
            Utils.showNotification('Please enter a valid amount.', 'warning');
            return;
          }

          await Wallet.processPayment(feeType, amount);
        });
      }

    } catch (err) {
      Utils.showNotification(err.message || 'Failed to load payment form', 'error');
    }
  },

  /**
   * Process a payment with mining animation
   */
  async processPayment(feeType, amount) {
    const overlay = document.getElementById('mining-overlay');
    const steps = [
      document.getElementById('step-validate'),
      document.getElementById('step-hash'),
      document.getElementById('step-consensus'),
      document.getElementById('step-confirm')
    ];

    // Reset steps
    steps.forEach(s => {
      if (s) {
        s.classList.remove('active', 'complete');
      }
    });

    // Show mining overlay
    if (overlay) overlay.style.display = 'flex';

    try {
      // Step 1: Validating
      if (steps[0]) steps[0].classList.add('active');
      await Utils.sleep(800);

      // Step 2: Computing hash
      if (steps[0]) { steps[0].classList.remove('active'); steps[0].classList.add('complete'); }
      if (steps[1]) steps[1].classList.add('active');
      await Utils.sleep(1000);

      // Step 3: PoA consensus — actual API call here
      if (steps[1]) { steps[1].classList.remove('active'); steps[1].classList.add('complete'); }
      if (steps[2]) steps[2].classList.add('active');

      const result = await API.makePayment(feeType, amount);

      await Utils.sleep(800);

      // Step 4: Confirmed!
      if (steps[2]) { steps[2].classList.remove('active'); steps[2].classList.add('complete'); }
      if (steps[3]) steps[3].classList.add('active');
      await Utils.sleep(600);
      if (steps[3]) { steps[3].classList.remove('active'); steps[3].classList.add('complete'); }

      await Utils.sleep(400);

      // Hide overlay
      if (overlay) overlay.style.display = 'none';

      // Success notification
      const blockNum = result.blockIndex ?? result.block_index ?? result.blockNumber ?? '?';
      Utils.showNotification(
        `Payment of ${Utils.formatNaira(amount)} confirmed in Block #${blockNum}!`,
        'success',
        '⛓️ Block Mined'
      );

      // Show receipt
      if (result.payment || result.paymentId || result.payment_id) {
        const paymentId = result.paymentId || result.payment_id || (result.payment && (result.payment._id || result.payment.id));
        if (paymentId) {
          this.showReceipt(paymentId);
        } else {
          this.showInlineReceipt(result);
        }
      } else {
        this.showInlineReceipt(result);
      }

      // Reload payment form data
      await this.loadPaymentPage();

    } catch (err) {
      // Hide overlay
      if (overlay) overlay.style.display = 'none';

      Utils.showNotification(err.message || 'Payment failed!', 'error');
    }
  },

  /**
   * Show receipt from inline result data (fallback)
   */
  showInlineReceipt(result) {
    const payment = result.payment || result;
    const modal = document.getElementById('modal-overlay');
    if (!modal) return;

    modal.innerHTML = `
      <div class="modal-content receipt-content">
        <button class="modal-close" onclick="document.getElementById('modal-overlay').classList.remove('active')">&times;</button>
        
        <div class="receipt-header">
          <div class="brand-icon"></div>
          <h2>Payment Receipt</h2>
          <p>BlockPay — Blockchain Payment System</p>
        </div>

        <div class="receipt-details">
          <div class="receipt-row">
            <span class="receipt-label">Fee Type</span>
            <span class="receipt-value">${Utils.escapeHtml(Utils.formatFeeType(payment.feeType || payment.fee_type || ''))}</span>
          </div>
          <div class="receipt-row total">
            <span class="receipt-label">Amount</span>
            <span class="receipt-value amount">${Utils.formatNaira(payment.amount)}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">USDT Equivalent</span>
            <span class="receipt-value">${Utils.formatUSDT(payment.amount)}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Block #</span>
            <span class="receipt-value">${payment.blockIndex ?? payment.block_index ?? payment.blockNumber ?? '—'}</span>
          </div>
          <div class="receipt-row stacked">
            <span class="receipt-label">Transaction Hash</span>
            <span class="receipt-value hash">${payment.txHash || payment.tx_hash || payment.transactionHash || '—'}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Status</span>
            <span class="receipt-value">${Utils.statusBadge(payment.status || 'confirmed')}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Date</span>
            <span class="receipt-value">${Utils.formatDate(payment.timestamp || payment.date || payment.createdAt || new Date().toISOString())}</span>
          </div>
        </div>

        <div class="receipt-footer">
          <p>This receipt was generated from a blockchain-verified transaction.<br>
          Secured by Simulated Consortium Blockchain • CSC476 Group 16</p>
        </div>

        <div class="receipt-actions">
          <button class="btn btn-primary flex-1" onclick="window.print()">Print Receipt</button>
          <button class="btn btn-secondary flex-1" onclick="document.getElementById('modal-overlay').classList.remove('active')">Close</button>
        </div>
      </div>
    `;
    modal.classList.add('active');
  },

  /**
   * Show receipt from API
   */
  async showReceipt(paymentId) {
    try {
      const data = await API.getReceipt(paymentId);
      const payment = data.payment || data.receipt;
      if (data.block && payment) {
        payment.blockIndex = data.block.index;
      }
      this.showInlineReceipt({ payment });
    } catch (err) {
      Utils.showNotification('Could not load receipt.', 'warning');
    }
  },

  /**
   * Load payment history page
   */
  async loadHistory() {
    try {
      Utils.showLoading('history-table-body');

      const data = await API.getHistory();
      const transactions = data.transactions || data.payments || data || [];

      const container = document.getElementById('history-table-body');
      if (!container) return;

      if (transactions.length === 0) {
        container.innerHTML = `
          <tr>
            <td colspan="8">
              <div class="empty-state">
                <div class="empty-state-icon"></div>
                <h4>No Payment History</h4>
                <p>Transactions will appear here after you make payments.</p>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      container.innerHTML = transactions.map(tx => {
        const hash = tx.txHash || tx.tx_hash || tx.transactionHash || '';
        return `
          <tr>
            <td>${Utils.formatDate(tx.timestamp || tx.date || tx.createdAt || tx.created_at)}</td>
            <td>${Utils.escapeHtml(Utils.formatFeeType(tx.feeType || tx.fee_type || ''))}</td>
            <td class="col-amount">${Utils.formatNaira(tx.amount)}</td>
            <td>${Utils.formatUSDT(tx.amount)}</td>
            <td><span class="badge badge-info">#${tx.blockIndex ?? tx.block_index ?? tx.blockNumber ?? '—'}</span></td>
            <td>
              <span class="hash-text" title="${Utils.escapeHtml(hash)}" onclick="Utils.copyToClipboard('${Utils.escapeHtml(hash)}')">
                ${Utils.truncateHash(hash)}
              </span>
            </td>
            <td>${Utils.statusBadge(tx.status || 'confirmed')}</td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="Wallet.showReceipt('${tx.id}')">
                Receipt
              </button>
            </td>
          </tr>
        `;
      }).join('');

    } catch (err) {
      Utils.showNotification(err.message || 'Failed to load history', 'error');
    }
  }
};

window.Wallet = Wallet;
