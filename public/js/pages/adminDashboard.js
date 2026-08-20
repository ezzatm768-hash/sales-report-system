async function renderAdminDashboard() {
  renderApp('<div class="loading-spinner"><div class="spinner"></div></div>', 'admin-dashboard');

  try {
    const data = await API.get('/admin/dashboard');
    const pageHTML = `
      <div class="page-header">
        <h1 class="page-title">مرحباً، ${API.user.name}</h1>
        <p class="page-subtitle">نظرة عامة على نظام تقييم فرق المبيعات</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-label">Team Leaders</div>
            <div class="stat-card-icon blue">👥</div>
          </div>
          <div class="stat-card-value">${data.totalTeamLeaders}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-label">إجمالي Sales</div>
            <div class="stat-card-icon green">💼</div>
          </div>
          <div class="stat-card-value">${data.totalSales}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-label">التقارير المكتملة</div>
            <div class="stat-card-icon teal">✅</div>
          </div>
          <div class="stat-card-value">${data.completedReports}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-label">التقارير المُرسلة</div>
            <div class="stat-card-icon orange">📤</div>
          </div>
          <div class="stat-card-value">${data.submittedReports}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-label">التقارير المعلقة</div>
            <div class="stat-card-icon purple">📝</div>
          </div>
          <div class="stat-card-value">${data.pendingReports}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-label">الفِرق النشطة</div>
            <div class="stat-card-icon red">🏢</div>
          </div>
          <div class="stat-card-value">${data.activeTeams}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">التقارير حسب Team Leader</h3>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Team Leader</th>
                <th>المكتملة</th>
                <th>المُرسلة</th>
                <th>المعلقة</th>
                <th>المُعاد</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${data.reportsByTeamLeader.length > 0 ? data.reportsByTeamLeader.map(r => `
                <tr>
                  <td><strong>${r.team_leader_name}</strong></td>
                  <td>${r.completed}</td>
                  <td>${r.submitted}</td>
                  <td>${r.pending}</td>
                  <td>${r.returned}</td>
                  <td>${r.total}</td>
                </tr>
              `).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--text-light)">لا توجد بيانات بعد</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
    renderApp(pageHTML, 'admin-dashboard');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
