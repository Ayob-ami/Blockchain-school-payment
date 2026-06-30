/* ============================================================
   BlockPay Utils — Helper Functions
   ============================================================ */

const Utils = {
  /**
   * Format a number as Nigerian Naira
   */
  formatNaira(amount) {
    const num = Number(amount) || 0;
    return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  /**
   * Convert Naira amount to USDT equivalent string
   */
  formatUSDT(nairaAmount) {
    const usdt = (Number(nairaAmount) || 0) / 1580;
    return usdt.toFixed(2) + ' USDT';
  },

  /**
   * Format a raw USDT number
   */
  formatUSDTRaw(nairaAmount) {
    return (Number(nairaAmount) || 0) / 1580;
  },

  /**
   * Format a date string into a human-readable format
   */
  formatDate(dateString) {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  },

  /**
   * Format a date as short (no time)
   */
  formatDateShort(dateString) {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  },

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  timeAgo(dateString) {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return Utils.formatDateShort(dateString);
  },

  /**
   * Truncate a hash string for display
   */
  truncateHash(hash, length = 8) {
    if (!hash || hash.length <= length + 6) return hash || '';
    return hash.substring(0, length) + '...' + hash.substring(hash.length - 6);
  },

  /**
   * Show a toast notification
   */
  showNotification(message, type = 'info', title = null) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const titles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info'
    };

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    notification.innerHTML = `
      <span class="notification-icon">${icons[type] || icons.info}</span>
      <div class="notification-body">
        <div class="notification-title">${Utils.escapeHtml(title || titles[type] || 'Notification')}</div>
        <div class="notification-message">${Utils.escapeHtml(message)}</div>
      </div>
      <span class="notification-close" onclick="this.parentElement.remove()">×</span>
      <div class="notification-progress" style="width: 100%"></div>
    `;

    container.appendChild(notification);

    // Animate progress bar
    const progress = notification.querySelector('.notification-progress');
    const duration = 4000;
    let start = null;
    function animate(timestamp) {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      progress.style.width = remaining + '%';
      if (elapsed < duration) {
        requestAnimationFrame(animate);
      }
    }
    requestAnimationFrame(animate);

    // Auto-dismiss
    setTimeout(() => {
      notification.classList.add('exiting');
      setTimeout(() => notification.remove(), 300);
    }, duration);
  },

  /**
   * Show a loading skeleton in a container
   */
  showLoading(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = `
      <div class="loading-skeleton skeleton-line long"></div>
      <div class="loading-skeleton skeleton-line medium" style="animation-delay: 0.1s"></div>
      <div class="loading-skeleton skeleton-line short" style="animation-delay: 0.2s"></div>
      <div class="loading-skeleton skeleton-line long" style="animation-delay: 0.3s"></div>
      <div class="loading-skeleton skeleton-line medium" style="animation-delay: 0.4s"></div>
    `;
  },

  /**
   * Hide loading skeleton
   */
  hideLoading(elementId) {
    // The content will replace the skeletons when data loads
  },

  /**
   * Get initials from a name
   */
  getInitials(name) {
    if (!name) return '?';
    return name.split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  },

  /**
   * Generate a deterministic color from a string (for avatars)
   */
  generateColor(str) {
    if (!str) return '#3b82f6';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#3b82f6', '#06b6d4', '#10b981', '#8b5cf6',
      '#f59e0b', '#ef4444', '#ec4899', '#14b8a6',
      '#6366f1', '#f97316'
    ];
    return colors[Math.abs(hash) % colors.length];
  },

  /**
   * Prevent XSS by escaping HTML
   */
  escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  },

  /**
   * Format a fee type string for display
   */
  formatFeeType(feeType) {
    if (!feeType) return '';
    return feeType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  },

  /**
   * Generate a status badge HTML
   */
  statusBadge(status) {
    const map = {
      confirmed: { class: 'badge-success', text: 'Confirmed' },
      pending: { class: 'badge-warning', text: 'Pending' },
      failed: { class: 'badge-danger', text: 'Failed' },
      active: { class: 'badge-success', text: 'Active' },
      inactive: { class: 'badge-danger', text: 'Inactive' },
      partial: { class: 'badge-warning', text: 'Partial' },
      completed: { class: 'badge-success', text: 'Completed' },
    };
    const s = (status || '').toLowerCase();
    const info = map[s] || { class: 'badge-neutral', text: status || 'Unknown' };
    return `<span class="badge ${info.class}">${info.text}</span>`;
  },

  /**
   * Delay / sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Debounce a function
   */
  debounce(func, wait = 300) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      Utils.showNotification('Copied to clipboard!', 'success');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      Utils.showNotification('Copied to clipboard!', 'success');
    }
  },

  /**
   * Calculate percentage
   */
  percentage(part, total) {
    if (!total || total === 0) return 0;
    return Math.min(100, Math.round((part / total) * 100));
  }
};

window.Utils = Utils;
