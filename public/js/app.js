/* ============================================================
   BlockPay App — SPA Controller & Routing
   ============================================================ */

const App = {
  currentPage: null,

  /**
   * Initialize the application
   */
  async init() {
    Auth.init(); // Initialize Auth module to bind form events & demo chips
    this.setupLogoutButton();
    this.setupSidebarToggle();

    // Check for existing token and login status
    const isLoggedIn = await Auth.autoLogin();
    if (isLoggedIn) {
      this.onLoginSuccess();
    } else {
      this.onLogout();
    }

    // Bind hashchange listener for page navigation
    window.addEventListener('hashchange', () => this.handleHashChange());
  },

  /**
   * Run when a user logs in successfully
   */
  onLoginSuccess() {
    this.showSidebar();
    this.setupSidebar();
    
    // Choose starting page based on role
    const role = Auth.getRole();
    if (role === 'student') {
      this.navigate('dashboard');
    } else if (role === 'bursar' || role === 'registrar') {
      this.navigate('admin-overview');
    } else if (role === 'auditor') {
      this.navigate('admin-transactions');
    } else {
      this.navigate('dashboard');
    }
  },

  /**
   * Run when user logs out or session is cleared
   */
  onLogout() {
    this.hideSidebar();
    this.showPage('page-login');
    window.location.hash = '';
  },

  /**
   * Setup sidebar items based on current user role
   */
  setupSidebar() {
    const user = Auth.currentUser;
    if (!user) return;

    // Set user info
    const avatarEl = document.getElementById('user-avatar-circle');
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');

    if (avatarEl) {
      avatarEl.textContent = Utils.getInitials(user.name);
      avatarEl.style.backgroundColor = Utils.generateColor(user.name);
    }
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role.toUpperCase();

    // Render nav links based on role
    const navContainer = document.getElementById('sidebar-nav-links');
    if (!navContainer) return;

    let links = [];
    if (user.role === 'student') {
      links = [
        { page: 'dashboard', label: '💳 My Wallet', icon: 'wallet' },
        { page: 'payment', label: '💸 Make Payment', icon: 'payment' },
        { page: 'history', label: '📜 Payment History', icon: 'history' },
        { page: 'explorer', label: '⛓️ Chain Explorer', icon: 'explorer' }
      ];
    } else if (user.role === 'bursar' || user.role === 'registrar') {
      links = [
        { page: 'admin-overview', label: '📊 Admin Overview', icon: 'overview' },
        { page: 'admin-students', label: '👥 Student Ledgers', icon: 'students' },
        { page: 'admin-transactions', label: '🧾 Transactions', icon: 'transactions' },
        { page: 'admin-reconciliation', label: '⚖️ Reconciliation', icon: 'reconciliation' },
        { page: 'explorer', label: '⛓️ Chain Explorer', icon: 'explorer' }
      ];
    } else if (user.role === 'auditor') {
      links = [
        { page: 'admin-transactions', label: '🧾 Ledger Audit', icon: 'transactions' },
        { page: 'admin-reconciliation', label: '⚖️ Reconciliation', icon: 'reconciliation' },
        { page: 'explorer', label: '⛓️ Chain Explorer', icon: 'explorer' }
      ];
    }

    navContainer.innerHTML = links.map(link => `
      <a href="#${link.page}" class="nav-link" id="nav-${link.page}">
        <span class="nav-link-text">${link.label}</span>
      </a>
    `).join('');
  },

  /**
   * Navigate to a page section
   */
  async navigate(page) {
    if (!Auth.isLoggedIn()) {
      this.onLogout();
      return;
    }

    this.currentPage = page;
    const sectionId = `page-${page}`;
    this.showPage(sectionId);

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const activeLink = document.getElementById(`nav-${page}`);
    if (activeLink) activeLink.classList.add('active');

    // Update URL hash without double firing
    if (window.location.hash !== `#${page}`) {
      window.location.hash = page;
    }

    // Load data specific to page
    try {
      switch (page) {
        case 'dashboard':
          await Wallet.loadDashboard();
          break;
        case 'payment':
          await Wallet.loadPaymentPage();
          break;
        case 'history':
          await Wallet.loadHistory();
          break;
        case 'admin-overview':
          await Admin.loadOverview();
          break;
        case 'admin-students':
          await Admin.loadStudents();
          break;
        case 'admin-transactions':
          await Admin.loadTransactions();
          break;
        case 'admin-reconciliation':
          await Admin.loadReconciliation();
          break;
        case 'explorer':
          await Explorer.loadExplorer();
          break;
      }
    } catch (err) {
      Utils.showNotification(err.message || 'Error loading page content', 'error');
    }
  },

  /**
   * Show a single page section and hide others
   */
  showPage(sectionId) {
    document.querySelectorAll('.page-section').forEach(sec => {
      sec.style.display = 'none';
      sec.classList.remove('active');
    });

    const targetSec = document.getElementById(sectionId);
    if (targetSec) {
      targetSec.style.display = 'block';
      // Trigger animation reflow
      void targetSec.offsetWidth;
      targetSec.classList.add('active');
    }
  },

  /**
   * Handle navigation triggered by window hash change
   */
  handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (!hash) {
      if (Auth.isLoggedIn()) {
        this.onLoginSuccess();
      } else {
        this.onLogout();
      }
      return;
    }

    // Ensure permissions match page
    const role = Auth.getRole();
    const studentPages = ['dashboard', 'payment', 'history', 'explorer'];
    const adminPages = ['admin-overview', 'admin-students', 'admin-transactions', 'admin-reconciliation', 'explorer'];
    const auditorPages = ['admin-transactions', 'admin-reconciliation', 'explorer'];

    let hasAccess = false;
    if (role === 'student' && studentPages.includes(hash)) hasAccess = true;
    if ((role === 'bursar' || role === 'registrar') && adminPages.includes(hash)) hasAccess = true;
    if (role === 'auditor' && auditorPages.includes(hash)) hasAccess = true;

    if (hasAccess) {
      this.navigate(hash);
    } else {
      Utils.showNotification('Access Denied: Insufficient Permissions.', 'error', 'Error');
      this.onLoginSuccess();
    }
  },

  /**
   * Sidebar controls
   */
  showSidebar() {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main-content');
    if (sidebar) sidebar.style.display = 'flex';
    if (main) main.classList.remove('full-width');
  },

  hideSidebar() {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main-content');
    if (sidebar) sidebar.style.display = 'none';
    if (main) main.classList.add('full-width');
  },

  setupSidebarToggle() {
    // Mobile menu toggle logic if needed
  },

  setupLogoutButton() {
    const btn = document.getElementById('sidebar-logout-btn');
    if (btn) {
      btn.onclick = (e) => {
        e.preventDefault();
        Auth.logout();
      };
    }
  }
};

window.App = App;

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
