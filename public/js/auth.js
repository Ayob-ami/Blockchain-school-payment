/* ============================================================
   BlockPay Auth — Login / Logout / Session Management
   ============================================================ */

const Auth = {
  currentUser: null,

  /**
   * Initialize auth module
   */
  init() {
    this.bindLoginForm();
    this.bindDemoChips();
  },

  /**
   * Bind the login form submit event
   */
  bindLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (!email || !password) {
        this.showLoginError('Please enter both email and password.');
        return;
      }

      await this.login(email, password);
    });
  },

  /**
   * Bind demo account chip clicks
   */
  bindDemoChips() {
    document.querySelectorAll('.demo-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const email = chip.getAttribute('data-email');
        const password = chip.getAttribute('data-password');

        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');

        if (emailInput) emailInput.value = email;
        if (passwordInput) passwordInput.value = password;

        // Add a brief visual feedback
        chip.style.transform = 'scale(0.95)';
        chip.style.borderColor = 'var(--accent-cyan)';
        setTimeout(() => {
          chip.style.transform = '';
        }, 150);
      });
    });
  },

  /**
   * Perform login
   */
  async login(email, password) {
    const btn = document.querySelector('#login-form .btn-primary');
    const btnText = btn?.querySelector('.btn-text');
    const btnLoader = btn?.querySelector('.btn-loader');

    try {
      // Show loading state
      if (btn) btn.disabled = true;
      if (btnText) btnText.textContent = 'Signing in...';
      if (btnLoader) btnLoader.style.display = 'inline-block';
      this.hideLoginError();

      const data = await API.login(email, password);

      // Store token and user
      API.setToken(data.token);
      this.currentUser = data.user;

      // Welcome notification
      Utils.showNotification(
        `Welcome back, ${this.currentUser.name}!`,
        'success',
        '🎉 Signed In'
      );

      // Navigate to appropriate page
      App.onLoginSuccess();

    } catch (err) {
      this.showLoginError(err.message || 'Login failed. Please try again.');
      Utils.showNotification(err.message || 'Login failed', 'error');
    } finally {
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = 'Sign In';
      if (btnLoader) btnLoader.style.display = 'none';
    }
  },

  /**
   * Auto-login with stored token
   */
  async autoLogin() {
    if (!API.token) return false;

    try {
      const data = await API.getMe();
      this.currentUser = data.user || data;
      return true;
    } catch {
      API.clearToken();
      this.currentUser = null;
      return false;
    }
  },

  /**
   * Logout
   */
  logout() {
    this.currentUser = null;
    API.clearToken();
    App.onLogout();
    Utils.showNotification('You have been signed out.', 'info', 'Signed Out');
  },

  /**
   * Show login error message
   */
  showLoginError(message) {
    const errorEl = document.getElementById('login-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  },

  /**
   * Hide login error message
   */
  hideLoginError() {
    const errorEl = document.getElementById('login-error');
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }
  },

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return !!this.currentUser;
  },

  /**
   * Check if user is an admin role
   */
  isAdmin() {
    return ['bursar', 'registrar', 'auditor'].includes(this.currentUser?.role);
  },

  /**
   * Check if user is an auditor
   */
  isAuditor() {
    return this.currentUser?.role === 'auditor';
  },

  /**
   * Get the user's role
   */
  getRole() {
    return this.currentUser?.role || '';
  }
};

window.Auth = Auth;
