/* ============================================================
   BlockPay Explorer — Blockchain Explorer Logic
   ============================================================ */

const Explorer = {
  chainData: null,

  /**
   * Load the blockchain explorer
   */
  async loadExplorer() {
    try {
      // Fetch chain data
      const data = await API.getChain();
      const chain = data.chain || data.blocks || data || [];
      this.chainData = chain;

      // Update stats
      const blockCount = document.getElementById('chain-block-count');
      const chainStatus = document.getElementById('chain-status');

      if (blockCount) blockCount.textContent = chain.length;
      if (chainStatus) {
        chainStatus.textContent = 'Valid ✓';
        chainStatus.className = 'stat-value chain-valid';
        chainStatus.style.color = 'var(--color-success)';
      }

      // Render visual blockchain
      this.renderBlockchain(chain);

      // Bind verify button
      const verifyBtn = document.getElementById('verify-chain-btn');
      if (verifyBtn) {
        verifyBtn.onclick = () => this.verifyChain();
      }

    } catch (err) {
      Utils.showNotification(err.message || 'Failed to load blockchain', 'error');
    }
  },

  /**
   * Render the visual blockchain
   */
  renderBlockchain(chain) {
    const container = document.getElementById('blockchain-visual');
    if (!container) return;

    if (!chain || chain.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="width:100%">
          <div class="empty-state-icon">⛓️</div>
          <h4>No Blocks Yet</h4>
          <p>The blockchain is empty. Make a payment to create the first block.</p>
        </div>
      `;
      return;
    }

    // Render blocks in order (genesis first)
    const blocks = [...chain];
    let html = '';

    blocks.forEach((block, idx) => {
      const index = block.index ?? block.blockIndex ?? idx;
      const hash = block.hash || '';
      const prevHash = block.previousHash || block.previous_hash || block.prevHash || '';
      const validator = block.validator || block.validatedBy || block.miner || 'Consortium';
      const timestamp = block.timestamp || block.createdAt || '';
      const txCount = block.transactions?.length || block.transactionCount || block.tx_count || 0;
      const isGenesis = index === 0;

      // Chain connector (between blocks)
      if (idx > 0) {
        html += `<div class="chain-connector"></div>`;
      }

      html += `
        <div class="block-card ${isGenesis ? 'genesis' : ''}" 
             onclick="Explorer.showBlockDetail(${idx})"
             style="animation: fadeInUp 0.5s ease-out ${idx * 0.1}s both;">
          <div class="block-number">
            <span>Block #${index}</span>
            ${isGenesis ? '<span class="genesis-badge">Genesis</span>' : ''}
          </div>
          <div class="block-detail">
            <div class="block-detail-row">
              <span class="block-detail-label">Hash</span>
              <span class="block-detail-value hash">${Utils.truncateHash(hash, 6)}</span>
            </div>
            <div class="block-detail-row">
              <span class="block-detail-label">Prev Hash</span>
              <span class="block-detail-value hash">${isGenesis ? '0000...0000' : Utils.truncateHash(prevHash, 6)}</span>
            </div>
            <div class="block-detail-row">
              <span class="block-detail-label">Validator</span>
              <span class="block-detail-value">${Utils.escapeHtml(validator)}</span>
            </div>
            <div class="block-detail-row">
              <span class="block-detail-label">Time</span>
              <span class="block-detail-value">${Utils.timeAgo(timestamp)}</span>
            </div>
          </div>
          <div class="block-tx-count">
            📦 ${txCount} transaction${txCount !== 1 ? 's' : ''}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  /**
   * Verify chain integrity
   */
  async verifyChain() {
    const btn = document.getElementById('verify-chain-btn');
    const chainStatus = document.getElementById('chain-status');
    const resultContainer = document.getElementById('chain-integrity-result');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="btn-loader"></span> Verifying...';
    }

    try {
      // Add a small delay for dramatic effect
      await Utils.sleep(1500);

      const result = await API.verifyChain();
      const isValid = result.valid !== false && result.isValid !== false;

      // Update status
      if (chainStatus) {
        chainStatus.textContent = isValid ? 'Valid ✓' : 'Invalid ✗';
        chainStatus.style.color = isValid ? 'var(--color-success)' : 'var(--color-error)';
      }

      // Show result banner
      if (resultContainer) {
        resultContainer.style.display = 'flex';
        resultContainer.className = `chain-integrity-result ${isValid ? 'valid' : 'invalid'}`;
        resultContainer.innerHTML = `
          <span class="icon">${isValid ? '✅' : '❌'}</span>
          <span class="message">${isValid
            ? 'Chain integrity verified! All blocks are valid and properly linked.'
            : result.error || result.message || 'Chain integrity check failed! Tampering detected.'
          }</span>
        `;
      }

      Utils.showNotification(
        isValid
          ? 'Blockchain integrity verified successfully!'
          : 'Chain integrity verification failed!',
        isValid ? 'success' : 'error',
        '🔍 Chain Verification'
      );

      // Highlight blocks briefly
      if (isValid) {
        document.querySelectorAll('.block-card').forEach((card, i) => {
          setTimeout(() => {
            card.style.borderColor = 'rgba(16, 185, 129, 0.6)';
            card.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.3)';
            setTimeout(() => {
              card.style.borderColor = '';
              card.style.boxShadow = '';
            }, 2000);
          }, i * 150);
        });
      }

    } catch (err) {
      Utils.showNotification(err.message || 'Verification failed', 'error');
      
      if (resultContainer) {
        resultContainer.style.display = 'flex';
        resultContainer.className = 'chain-integrity-result invalid';
        resultContainer.innerHTML = `
          <span class="icon">❌</span>
          <span class="message">Error during verification: ${Utils.escapeHtml(err.message)}</span>
        `;
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '🔍 Verify Chain Integrity';
      }
    }
  },

  /**
   * Show block detail modal
   */
  showBlockDetail(blockIdx) {
    if (!this.chainData || !this.chainData[blockIdx]) return;

    const block = this.chainData[blockIdx];
    const index = block.index ?? block.blockIndex ?? blockIdx;
    const hash = block.hash || '';
    const prevHash = block.previousHash || block.previous_hash || block.prevHash || '';
    const validator = block.validator || block.validatedBy || block.miner || 'Consortium';
    const timestamp = block.timestamp || block.createdAt || '';
    const nonce = block.nonce ?? block.proof ?? '—';
    const transactions = block.transactions || [];
    const isGenesis = index === 0;

    const modal = document.getElementById('modal-overlay');
    if (!modal) return;

    let txHtml = '';
    if (transactions.length > 0) {
      txHtml = `
        <h4 class="block-txns-title">📦 Transactions (${transactions.length})</h4>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(tx => `
                <tr>
                  <td>
                    <span class="hash-text" style="max-width:100px" title="${Utils.escapeHtml(tx.from || tx.sender || '')}">
                      ${Utils.truncateHash(tx.from || tx.sender || '—', 6)}
                    </span>
                  </td>
                  <td>
                    <span class="hash-text" style="max-width:100px" title="${Utils.escapeHtml(tx.to || tx.recipient || '')}">
                      ${Utils.truncateHash(tx.to || tx.recipient || '—', 6)}
                    </span>
                  </td>
                  <td class="col-amount">${Utils.formatNaira(tx.amount)}</td>
                  <td>${Utils.escapeHtml(Utils.formatFeeType(tx.feeType || tx.fee_type || tx.type || ''))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (isGenesis) {
      txHtml = `
        <div class="empty-state" style="padding: var(--space-4)">
          <p>Genesis block — no transactions</p>
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="modal-content block-detail-modal">
        <button class="modal-close" onclick="document.getElementById('modal-overlay').classList.remove('active')">&times;</button>
        
        <div class="modal-header">
          <h2>⛓️ Block #${index} ${isGenesis ? '(Genesis)' : ''}</h2>
          <p>Full block details and transactions</p>
        </div>

        <div class="detail-grid">
          <span class="detail-label">Block Index</span>
          <span class="detail-value">${index}</span>
          
          <span class="detail-label">Timestamp</span>
          <span class="detail-value">${Utils.formatDate(timestamp)}</span>
          
          <span class="detail-label">Validator</span>
          <span class="detail-value">${Utils.escapeHtml(validator)}</span>
          
          <span class="detail-label">Nonce / Proof</span>
          <span class="detail-value">${nonce}</span>
          
          <span class="detail-label">Block Hash</span>
          <span class="detail-value mono">${Utils.escapeHtml(hash) || '—'}</span>
          
          <span class="detail-label">Previous Hash</span>
          <span class="detail-value mono">${isGenesis ? '0'.repeat(64) : (Utils.escapeHtml(prevHash) || '—')}</span>
          
          <span class="detail-label">Transactions</span>
          <span class="detail-value">${transactions.length}</span>
        </div>

        ${txHtml}
      </div>
    `;

    modal.classList.add('active');
  }
};

window.Explorer = Explorer;
