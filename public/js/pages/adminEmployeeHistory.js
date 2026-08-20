async function renderAdminEmployeeHistory() {
  renderApp('<div class="loading-spinner"><div class="spinner"></div></div>', 'admin-history');

  try {
    const sales = await API.get('/admin/sales');
    const pageHTML = `
      <div class="page-header">
        <h1 class="page-title">سجل الموظفين</h1>
        <p class="page-subtitle">عرض تاريخ أداء كل موظف عبر الفترات</p>
      </div>

      <div class="filters-bar">
        <div class="filter-group">
          <label>اختر الموظف</label>
          <select id="history-sales" onchange="loadEmployeeHistory()">
            <option value="">-- اختر موظف --</option>
            ${sales.map(s => `<option value="${s.id}">${s.name} - ${s.team_leader_name}</option>`).join('')}
          </select>
        </div>
      </div>

      <div id="history-content"></div>
    `;
    renderApp(pageHTML, 'admin-history');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadEmployeeHistory() {
  const salesId = document.getElementById('history-sales').value;
  const container = document.getElementById('history-content');
  if (!salesId) { container.innerHTML = ''; return; }

  container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

  try {
    const reports = await API.get(`/admin/employee-history/${salesId}`);
    if (reports.length === 0) {
      container.innerHTML = '<div class="card"><div class="card-body"><div class="empty-state"><div class="empty-state-icon">📈</div><div class="empty-state-text">لا توجد تقارير لهذا الموظف</div></div></div></div>';
      return;
    }

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">سجل الأداء - ${reports.length} تقرير</h3>
        </div>
        <div class="card-body">
          ${reports.map(r => `
            <div style="margin-bottom:30px;border:1px solid var(--border);border-radius:var(--radius);padding:20px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                <div>
                  <h4 style="font-size:16px;font-weight:700">${r.period_name}</h4>
                  <span style="font-size:13px;color:var(--text-light)">${formatDate(r.start_date)}</span>
                </div>
                ${statusBadge(r.status)}
              </div>
              ${r.answers.length > 0 ? r.answers.map(a => `
                <div style="margin-bottom:12px">
                  <div style="font-weight:600;font-size:13px;color:var(--primary);margin-bottom:4px">${a.field_name}</div>
                  <div style="font-size:14px;line-height:1.6;padding:10px;background:#f8fafc;border-radius:6px;white-space:pre-wrap">${a.answer || 'لا توجد ملاحظات'}</div>
                </div>
              `).join('') : '<p style="color:var(--text-light)">لم يتم ملء التقرير بعد</p>'}
              ${r.admin_notes ? `<div style="margin-top:12px;padding:10px;background:#fff3e0;border-radius:6px;font-size:13px"><strong>ملاحظات المراجعة:</strong> ${r.admin_notes}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    showToast(err.message, 'error');
  }
}
