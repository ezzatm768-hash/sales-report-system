async function renderTLReports() {
  renderApp('<div class="loading-spinner"><div class="spinner"></div></div>', 'tl-reports');

  try {
    const reports = await API.get('/team-leader/reports');
    const pageHTML = `
      <div class="page-header">
        <h1 class="page-title">التقارير</h1>
        <p class="page-subtitle">جميع تقارير التقييم</p>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Sales</th>
                <th>الفترة</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${reports.length > 0 ? reports.map(r => `
                <tr>
                  <td><strong>${r.sales_name}</strong></td>
                  <td>${r.period_name}</td>
                  <td>${statusBadge(r.status)}</td>
                  <td>${formatDate(r.created_at)}</td>
                  <td class="action-btns">
                    <button class="btn btn-sm btn-outline" onclick="openEvaluation(${r.sales_id}, ${r.evaluation_period_id}, ${r.id}, '${r.status}')">
                      تعديل
                    </button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="5" class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">لا توجد تقارير بعد</div></td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
    renderApp(pageHTML, 'tl-reports');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
