function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showModal(title, content, footer = '') {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal-content');
  modal.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">${title}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">${content}</div>
    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
  `;
  overlay.classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

function statusBadge(status) {
  const map = { draft: 'مسودة', submitted: 'مُرسل', reviewed: 'تمت المراجعة', returned: 'مُعاد', active: 'نشط', inactive: 'غير نشط' };
  return `<span class="badge badge-${status}">${map[status] || status}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

function sidebarHTML(currentPage) {
  const user = API.user;
  const isAdmin = user.role === 'admin';

  const adminNav = [
    { id: 'admin-dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'admin-team-leaders', icon: '👥', label: 'Team Leaders' },
    { id: 'admin-reports', icon: '📋', label: 'التقارير' },
    { id: 'admin-periods', icon: '📅', label: 'الفترات الزمنية' },
    { id: 'admin-fields', icon: '⚙️', label: 'خانات التقييم' },
    { id: 'admin-history', icon: '📈', label: 'سجل الموظفين' },
  ];

  const tlNav = [
    { id: 'tl-dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'tl-members', icon: '👥', label: 'أعضاء الفريق' },
    { id: 'tl-reports', icon: '📋', label: 'التقارير' },
  ];

  const nav = isAdmin ? adminNav : tlNav;

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">VS Development</div>
        <div class="sidebar-role">${isAdmin ? 'Admin Panel' : 'Team Leader'}</div>
      </div>
      <nav class="sidebar-nav">
        ${nav.map(item => `
          <div class="sidebar-nav-item ${currentPage === item.id ? 'active' : ''}" onclick="Router.navigate('/${item.id}')">
            <span>${item.icon}</span>
            <span>${item.label}</span>
          </div>
        `).join('')}
      </nav>
      <div class="sidebar-user">
        <div class="sidebar-user-info">
          <div class="sidebar-avatar">${user.name.charAt(0)}</div>
          <div>
            <div class="sidebar-user-name">${user.name}</div>
            <div class="sidebar-user-role">${isAdmin ? 'Administrator' : 'Team Leader'}</div>
          </div>
        </div>
        <button class="logout-btn" onclick="handleLogout()">تسجيل الخروج</button>
      </div>
    </aside>
  `;
}

function handleLogout() {
  API.clearAuth();
  window.location.href = '/';
}

function renderApp(pageHTML, currentPage) {
  document.getElementById('app').innerHTML = `
    <button class="mobile-menu-toggle" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</button>
    <div class="app-layout">
      ${sidebarHTML(currentPage)}
      <main class="main-content">${pageHTML}</main>
    </div>
  `;
}
