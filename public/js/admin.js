/* ============================================================
   BlockPay Admin — Admin Dashboard Logic
   ============================================================ */

const Admin = {

  /**
   * Load admin overview / dashboard
   */
  async loadOverview() {
    try {
      const data = await API.getOverview();

      // Extract values (handle both camelCase and snake_case)
      const totalCollected = data.totalCollected || data.total_collected || 0;
      const pendingAmount = data.pendingAmount || data.pending_amount || 0;
      const activeStudents = data.activeStudents || data.active_students || 0;
      const totalTransactions = data.totalTransactions || data.total_transactions || 0;
      const avgSettlement = data.avgSettlementTime || data.avg_settlement_time || '< 5s';
      const reconAccuracy = data.reconciliationAccuracy || data.reconciliation_accuracy || '100%';

      // Update stat cards
      const statCards = document.querySelectorAll('#page-admin-overview .stat-value');
      const statValues = [
        Utils.formatNaira(totalCollected),
        Utils.formatNaira(pendingAmount),
        activeStudents,
        totalTransactions,
        typeof avgSettlement === 'number' ? avgSettlement + 's' : avgSettlement,
        typeof reconAccuracy === 'number' ? reconAccuracy + '%' : reconAccuracy
      ];
      statCards.forEach((card, i) => {
        if (statValues[i] !== undefined) card.textContent = statValues[i];
      });

      // Fee savings comparison
      const txCount = totalTransactions || 1;
      const totalValue = totalCollected || 0;
      const traditionalFee = totalValue * 0.025; // 2.5%
      const blockchainFee = txCount * (0.05 * 1580); // $0.05 per tx in Naira
      const savings = traditionalFee - blockchainFee;

      const tradEl = document.getElementById('traditional-fee');
      const blockEl = document.getElementById('blockchain-fee');
      const saveEl = document.getElementById('savings-amount');

      if (tradEl) tradEl.textContent = Utils.formatNaira(traditionalFee);
      if (blockEl) blockEl.textContent = Utils.formatNaira(blockchainFee);
      if (saveEl) saveEl.textContent = Utils.formatNaira(Math.max(0, savings));

      // Adjust bar widths
      const tradBar = document.querySelector('.comparison-bar.traditional');
      const blockBar = document.querySelector('.comparison-bar.blockchain');
      if (tradBar && blockBar && traditionalFee > 0) {
        tradBar.style.width = '100%';
        const ratio = Math.max(5, (blockchainFee / traditionalFee) * 100);
        blockBar.style.width = ratio + '%';
      }

      // Load recent activity
      await this.loadRecentActivity(data.recentActivity || data.recent_activity || []);

      // Fetch transactions for charting
      let transactions = [];
      try {
        const txData = await API.getTransactions();
        transactions = txData.transactions || txData || [];
      } catch (err) {
        console.warn('Failed to fetch transactions for admin overview charts', err);
      }

      // Group by fee category and render donut
      const feeGroups = {};
      transactions.filter(t => (t.status || '').toLowerCase() === 'confirmed').forEach(tx => {
        const type = tx.feeType || tx.fee_type || 'Other';
        feeGroups[type] = (feeGroups[type] || 0) + (tx.amount || 0);
      });
      this.renderFeeDistribution(feeGroups);

      // Render transaction volume
      this.renderTransactionVolume(transactions);

    } catch (err) {
      Utils.showNotification(err.message || 'Failed to load admin overview', 'error');
    }
  },

  /**
   * Load recent activity feed
   */
  async loadRecentActivity(activities) {
    const container = document.getElementById('admin-activity-feed');
    if (!container) return;

    // If no activities from overview, try loading transactions
    let items = activities;
    if ((!items || items.length === 0)) {
      try {
        const data = await API.getTransactions();
        const txns = (data.transactions || data || []).slice(0, 8);
        items = txns.map(tx => ({
          icon: '💳',
          text: `<strong>${Utils.escapeHtml(tx.studentName || tx.student_name || 'Student')}</strong> paid ${Utils.formatNaira(tx.amount)} for ${Utils.escapeHtml(Utils.formatFeeType(tx.feeType || tx.fee_type || ''))}`,
          time: tx.timestamp || tx.date || tx.createdAt || tx.created_at
        }));
      } catch {
        items = [];
      }
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <h4>No Recent Activity</h4>
          <p>Transaction activity will appear here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `<div class="activity-feed">${items.map(item => `
      <div class="activity-item">
        <div class="activity-icon">${item.icon || '💳'}</div>
        <div class="activity-content">
          <div class="activity-text">${item.text}</div>
          <div class="activity-time">${Utils.timeAgo(item.time)}</div>
        </div>
      </div>
    `).join('')}</div>`;
  },

  /**
   * Load students management page
   */
  async loadStudents() {
    try {
      Utils.showLoading('students-table-body');

      const data = await API.getStudents();
      const students = data.students || data || [];

      const container = document.getElementById('students-table-body');
      if (!container) return;

      if (students.length === 0) {
        container.innerHTML = `
          <tr>
            <td colspan="6">
              <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <h4>No Students Found</h4>
                <p>Student records will appear here.</p>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      container.innerHTML = students.map(student => {
        const name = student.name || '';
        const matric = student.matricNo || student.matric_no || student.matricNumber || '';
        const dept = student.department || '';
        const totalFees = student.totalFees || student.total_fees || 0;
        const totalPaid = student.totalPaid || student.total_paid || 0;
        const pct = Utils.percentage(totalPaid, totalFees);
        const enrollment = student.enrollmentStatus || student.enrollment_status || 'Inactive';
        const color = Utils.generateColor(name);

        return `
          <tr>
            <td>
              <div class="d-flex items-center gap-3">
                <div class="user-avatar" style="background: ${color}; width:32px; height:32px; font-size:0.7rem;">
                  ${Utils.getInitials(name)}
                </div>
                <span>${Utils.escapeHtml(name)}</span>
              </div>
            </td>
            <td class="mono" style="font-size: 0.8rem; color: var(--text-muted)">${Utils.escapeHtml(matric)}</td>
            <td>${Utils.escapeHtml(dept)}</td>
            <td class="col-amount">${Utils.formatNaira(totalPaid)} / ${Utils.formatNaira(totalFees)}</td>
            <td>
              <div class="d-flex items-center gap-2" style="min-width: 120px">
                <div class="progress-bar" style="flex:1">
                  <div class="progress-fill ${pct >= 100 ? 'success' : ''}" style="width:${pct}%"></div>
                </div>
                <small style="color: var(--text-muted); white-space:nowrap">${pct}%</small>
              </div>
            </td>
            <td>${Utils.statusBadge(enrollment)}</td>
          </tr>
        `;
      }).join('');

    } catch (err) {
      Utils.showNotification(err.message || 'Failed to load students', 'error');
    }
  },

  /**
   * Load transactions ledger page
   */
  async loadTransactions() {
    try {
      Utils.showLoading('admin-transactions-body');

      const data = await API.getTransactions();
      this.allTransactions = data.transactions || data || [];
      this.renderTransactions(this.allTransactions);

      // Bind search
      const searchInput = document.getElementById('admin-search-input');
      if (searchInput) {
        searchInput.oninput = Utils.debounce(() => {
          const query = searchInput.value.toLowerCase().trim();
          if (!query) {
            this.renderTransactions(this.allTransactions);
            return;
          }
          const filtered = this.allTransactions.filter(tx => {
            const searchable = [
              tx.studentName || tx.student_name || '',
              tx.feeType || tx.fee_type || '',
              tx.txHash || tx.tx_hash || tx.transactionHash || '',
              String(tx.amount || ''),
              tx.status || ''
            ].join(' ').toLowerCase();
            return searchable.includes(query);
          });
          this.renderTransactions(filtered);
        }, 250);
      }

    } catch (err) {
      Utils.showNotification(err.message || 'Failed to load transactions', 'error');
    }
  },

  /**
   * Render transaction rows
   */
  renderTransactions(transactions) {
    const container = document.getElementById('admin-transactions-body');
    if (!container) return;

    if (!transactions || transactions.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-state-icon"></div>
              <h4>No Transactions Found</h4>
              <p>No matching transactions.</p>
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
          <td>${Utils.escapeHtml(tx.studentName || tx.student_name || '—')}</td>
          <td>${Utils.escapeHtml(Utils.formatFeeType(tx.feeType || tx.fee_type || ''))}</td>
          <td class="col-amount">${Utils.formatNaira(tx.amount)}</td>
          <td><span class="badge badge-info">#${tx.blockIndex ?? tx.block_index ?? tx.blockNumber ?? '—'}</span></td>
          <td>
            <span class="hash-text" title="${Utils.escapeHtml(hash)}" onclick="Utils.copyToClipboard('${Utils.escapeHtml(hash)}')">
              ${Utils.truncateHash(hash)}
            </span>
          </td>
          <td>${Utils.statusBadge(tx.status || 'confirmed')}</td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Load reconciliation report
   */
  async loadReconciliation() {
    try {
      const data = await API.getReconciliation();

      const expectedRevenue = data.expectedRevenue || data.expected_revenue || data.totalExpected || 0;
      const totalCollected = data.totalCollected || data.total_collected || 0;
      const discrepancy = data.discrepancy || (expectedRevenue - totalCollected) || 0;
      const accuracy = data.accuracy || data.reconciliationAccuracy || 100;
      const totalStudents = data.totalStudents || data.total_students || 0;
      const totalTransactions = data.totalTransactions || data.total_transactions || 0;
      const unreconciled = data.unreconciledItems || data.unreconciled || 0;

      // Update summary values
      const reconValues = document.querySelectorAll('#page-admin-reconciliation .recon-item-value');
      if (reconValues[0]) reconValues[0].textContent = Utils.formatNaira(expectedRevenue);
      if (reconValues[1]) reconValues[1].textContent = Utils.formatNaira(totalCollected);
      if (reconValues[2]) {
        reconValues[2].textContent = Utils.formatNaira(Math.abs(discrepancy));
        reconValues[2].style.color = discrepancy === 0 ? 'var(--color-success)' : 'var(--color-warning)';
      }

      // Update metrics
      const metricValues = document.querySelectorAll('#page-admin-reconciliation .recon-metric-value');
      const metricData = [
        { value: '70% of work hours', color: 'var(--color-error)' },
        { value: '0% (Automated)', color: 'var(--color-success)' },
        { value: typeof accuracy === 'number' ? accuracy + '%' : accuracy, color: 'var(--color-success)' },
        { value: totalTransactions + ' transactions', color: 'var(--text-primary)' },
        { value: totalStudents + ' students', color: 'var(--text-primary)' },
        { value: unreconciled + ' items', color: unreconciled === 0 ? 'var(--color-success)' : 'var(--color-warning)' }
      ];

      metricValues.forEach((el, i) => {
        if (metricData[i]) {
          el.textContent = metricData[i].value;
          el.style.color = metricData[i].color;
        }
      });

    } catch (err) {
      Utils.showNotification(err.message || 'Failed to load reconciliation', 'error');
    }
  },

  /**
   * Render dynamic Fee Distribution Donut Chart using inline SVG
   */
  renderFeeDistribution(feeGroups) {
    const wrapper = document.getElementById('donut-chart-wrapper');
    if (!wrapper) return;
    
    const categories = Object.keys(feeGroups);
    const values = Object.values(feeGroups);
    const total = values.reduce((s, v) => s + v, 0);
    
    if (total === 0) {
      wrapper.innerHTML = `<p class="text-muted text-center p-4">No payment data available for distribution.</p>`;
      return;
    }
    
    const colors = ['#a855f7', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    
    let accumulatedPercent = 0;
    const r = 24; // circle radius
    const circ = 2 * Math.PI * r; // ≈ 150.8
    
    let circlesHtml = '';
    let legendHtml = '';
    
    categories.forEach((cat, idx) => {
      const val = feeGroups[cat];
      const pct = (val / total) * 100;
      const strokeColor = colors[idx % colors.length];
      
      const strokeWidthVal = (pct / 100) * circ;
      const rotateOffset = (accumulatedPercent / 100) * 360;
      accumulatedPercent += pct;
      
      circlesHtml += `
        <circle class="donut-segment" cx="50" cy="50" r="${r}" fill="transparent" 
                stroke="${strokeColor}" stroke-width="8" 
                stroke-dasharray="${strokeWidthVal} ${circ - strokeWidthVal}" 
                stroke-dashoffset="0" transform="rotate(${rotateOffset - 90} 50 50)"
                title="${Utils.escapeHtml(Utils.formatFeeType(cat))}: ${Utils.formatNaira(val)} (${pct.toFixed(1)}%)">
        </circle>
      `;
      
      legendHtml += `
        <div class="legend-item">
          <span class="legend-dot" style="background: ${strokeColor}"></span>
          <span style="flex:1">${Utils.escapeHtml(Utils.formatFeeType(cat))}</span>
          <span style="font-weight:bold">${pct.toFixed(0)}%</span>
        </div>
      `;
    });
    
    wrapper.innerHTML = `
      <div class="donut-chart-container">
        <svg class="donut-chart-svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="${r}" fill="transparent" stroke="rgba(255,255,255,0.02)" stroke-width="8" />
          ${circlesHtml}
          <circle cx="50" cy="50" r="${r - 4}" fill="var(--bg-tertiary)" />
          <text class="donut-center-text" x="50" y="48" dominant-baseline="middle" text-anchor="middle">${Utils.formatNaira(total).split('.')[0]}</text>
          <text class="donut-center-label" x="50" y="58" dominant-baseline="middle" text-anchor="middle">TOTAL SETTLED</text>
        </svg>
        <div class="chart-legend">
          ${legendHtml}
        </div>
      </div>
    `;
  },

  /**
   * Render dynamic horizontal bar chart representing ledger transactions volume
   */
  renderTransactionVolume(transactions) {
    const wrapper = document.getElementById('bar-chart-wrapper');
    if (!wrapper) return;
    
    const confirmedTx = transactions.filter(t => (t.status || '').toLowerCase() === 'confirmed');
    
    if (confirmedTx.length === 0) {
      wrapper.innerHTML = `<p class="text-muted text-center p-4">No confirmed transaction volume data.</p>`;
      return;
    }
    
    // Group transactions by date
    const dateGroups = {};
    confirmedTx.forEach(tx => {
      const dateStr = Utils.formatDateShort(tx.timestamp || tx.date || tx.createdAt || tx.created_at);
      dateGroups[dateStr] = (dateGroups[dateStr] || 0) + 1;
    });
    
    const dates = Object.keys(dateGroups).slice(-6); // Last 6 days
    const maxVal = Math.max(...Object.values(dateGroups), 1);
    
    let barsHtml = '';
    dates.forEach(date => {
      const count = dateGroups[date];
      const pct = (count / maxVal) * 100;
      
      barsHtml += `
        <div class="bar-chart-row">
          <span class="bar-chart-label" title="${Utils.escapeHtml(date)}">${Utils.escapeHtml(date)}</span>
          <div class="bar-chart-bar-wrap">
            <div class="bar-chart-bar-fill" style="width: ${pct}%"></div>
          </div>
          <span class="bar-chart-val">${count} Tx${count !== 1 ? 's' : ''}</span>
        </div>
      `;
    });
    
    wrapper.innerHTML = `
      <div class="bar-chart-container">
        ${barsHtml}
      </div>
    `;
  }
};

window.Admin = Admin;
