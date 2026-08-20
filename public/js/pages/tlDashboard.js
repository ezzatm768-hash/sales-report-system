async function renderTLDashboard() {
  renderApp('<div class="loading-spinner"><div class="spinner"></div></div>', 'tl-dashboard');

  try {
    const data = await API.get('/team-leader/dashboard');
    
    // Check if all submitted reports are reviewed
    const submittedOrReviewed = data.reports.filter(r => r.status === 'submitted' || r.status === 'reviewed');
    const allReviewed = submittedOrReviewed.length > 0 && submittedOrReviewed.every(r => r.status === 'reviewed');
    const hasReturned = data.reports.some(r => r.status === 'returned');

    const pageHTML = `
      <div class="page-header">
        <h1 class="page-title">مرحباً، ${API.user.name}</h1>
        <p class="page-subtitle">${data.team ? data.team.team_name : 'لوحة التحكم'}</p>
      </div>

      ${allReviewed ? `
        <div style="background:linear-gradient(135deg,#2e7d32,#43a047);color:white;border-radius:var(--radius);padding:24px;margin-bottom:24px;text-align:center">
          <div style="font-size:24px;margin-bottom:8px">✅</div>
          <div style="font-size:20px;font-weight:800">تم مراجعة جميع التقارير من الـ Admin</div>
          <div style="font-size:14px;opacity:0.9;margin-top:4px">جميع تقارير فريقك تمت مراجعتها</div>
        </div>
      ` : ''}

      ${hasReturned ? `
        <div style="background:linear-gradient(135deg,#c62828,#e53935);color:white;border-radius:var(--radius);padding:24px;margin-bottom:24px;text-align:center">
          <div style="font-size:24px;margin-bottom:8px">⚠️</div>
          <div style="font-size:20px;font-weight:800">يوجد تقارير معاده من الـ Admin</div>
          <div style="font-size:14px;opacity:0.9;margin-top:4px">يرجى مراجعة التقارير وإعادة إرسالها</div>
        </div>
      ` : ''}

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-label">أعضاء الفريق</div>
            <div class="stat-card-icon blue">👥</div>
          </div>
          <div class="stat-card-value">${data.stats.totalMembers}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-label">التقارير المطلوبة</div>
            <div class="stat-card-icon orange">📋</div>
          </div>
          <div class="stat-card-value">${data.stats.requiredReports}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-label">المُراجعة</div>
            <div class="stat-card-icon green">✅</div>
          </div>
          <div class="stat-card-value">${data.stats.completedReports}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-label">المُرسلة (بانتظار المراجعة)</div>
            <div class="stat-card-icon teal">📤</div>
          </div>
          <div class="stat-card-value">${data.stats.submittedReports}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-label">المسودات</div>
            <div class="stat-card-icon purple">📝</div>
          </div>
          <div class="stat-card-value">${data.stats.pendingReports}</div>
        </div>
      </div>

      ${data.activePeriod ? `
        <div class="card" style="margin-bottom:24px">
          <div class="card-header">
            <h3 class="card-title">الفترة الحالية: ${data.activePeriod.name}</h3>
          </div>
        </div>
      ` : ''}

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">حالة التقارير</h3>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Sales Name</th>
                <th>حالة التقرير</th>
                <th>الفترة</th>
                <th>ملاحظات Admin</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              ${data.reports.length > 0 ? data.reports.map(r => `
                <tr>
                  <td><strong>${r.sales_name}</strong></td>
                  <td>${statusBadge(r.status)}</td>
                  <td>${r.period_name}</td>
                  <td>${r.admin_notes ? '<span style="color:var(--warning);font-size:13px">⚠️ ' + r.admin_notes + '</span>' : '-'}</td>
                  <td>
                    <button class="btn btn-sm btn-outline" onclick="openEvaluation(${r.sales_id}, ${r.evaluation_period_id}, ${r.id}, '${r.status}')">
                      تعديل
                    </button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="5" class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">لا توجد تقارير حالياً</div></td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
    renderApp(pageHTML, 'tl-dashboard');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
