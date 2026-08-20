async function renderAdminReports() {
  renderApp('<div class="loading-spinner"><div class="spinner"></div></div>', 'admin-reports');

  try {
    const [reports, leaders, periods] = await Promise.all([
      API.get('/admin/reports'),
      API.get('/admin/team-leaders'),
      API.get('/admin/periods')
    ]);

    const pageHTML = `
      <div class="page-header">
        <h1 class="page-title">التقارير</h1>
        <p class="page-subtitle">عرض وإدارة جميع تقارير التقييم</p>
      </div>

      <div class="filters-bar">
        <div class="filter-group">
          <label>Team Leader</label>
          <select id="filter-tl" onchange="filterReports()">
            <option value="">الكل</option>
            ${leaders.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>الفترة</label>
          <select id="filter-period" onchange="filterReports()">
            <option value="">الكل</option>
            ${periods.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>الحالة</label>
          <select id="filter-status" onchange="filterReports()">
            <option value="">الكل</option>
            <option value="draft">مسودة</option>
            <option value="submitted">مُرسل</option>
            <option value="reviewed">تمت المراجعة</option>
            <option value="returned">مُعاد</option>
          </select>
        </div>
        <div class="filter-group">
          <label>بحث</label>
          <input type="text" id="filter-search" placeholder="ابحث بالاسم..." oninput="filterReports()">
        </div>
      </div>

      <div class="card">
        <div class="table-container">
          <table id="reports-table">
            <thead>
              <tr>
                <th>Sales</th>
                <th>Team Leader</th>
                <th>الفترة</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody id="reports-tbody">
              ${renderReportsRows(reports)}
            </tbody>
          </table>
        </div>
      </div>
    `;
    renderApp(pageHTML, 'admin-reports');
    window._allReports = reports;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderReportsRows(reports) {
  if (reports.length === 0) {
    return '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">لا توجد تقارير</div></td></tr>';
  }
  return reports.map(r => `
    <tr>
      <td><strong>${r.sales_name}</strong></td>
      <td>${r.team_leader_name}</td>
      <td>${r.period_name}</td>
      <td>${statusBadge(r.status)}</td>
      <td>${formatDate(r.created_at)}</td>
      <td class="action-btns">
        <button class="btn btn-sm btn-outline" onclick="viewAdminReport(${r.id})">عرض</button>
        ${r.status === 'submitted' ? `
          <button class="btn btn-sm btn-success" onclick="reviewReport(${r.id})">مراجعة</button>
          <button class="btn btn-sm btn-danger" onclick="returnReport(${r.id})">إعادة</button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

async function filterReports() {
  const tl = document.getElementById('filter-tl').value;
  const period = document.getElementById('filter-period').value;
  const status = document.getElementById('filter-status').value;
  const search = document.getElementById('filter-search').value;

  let url = '/admin/reports?';
  if (tl) url += `team_leader_id=${tl}&`;
  if (period) url += `period_id=${period}&`;
  if (status) url += `status=${status}&`;
  if (search) url += `search=${search}&`;

  try {
    const reports = await API.get(url);
    document.getElementById('reports-tbody').innerHTML = renderReportsRows(reports);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function viewAdminReport(id) {
  Router.navigate(`/admin-report-view/${id}`);
}

async function reviewReport(id) {
  showModal('مراجعة التقرير', `
    <div class="form-group">
      <label>ملاحظات المراجعة (اختياري)</label>
      <textarea id="admin-notes" rows="4" placeholder="أضف ملاحظات..."></textarea>
    </div>
  `, `<button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-success" onclick="confirmReview(${id})">تأكيد المراجعة</button>`);
}

async function confirmReview(id) {
  const notes = document.getElementById('admin-notes').value;
  try {
    await API.put(`/admin/reports/${id}/status`, { status: 'reviewed', admin_notes: notes });
    showToast('تمت مراجعة التقرير', 'success');
    closeModal();
    renderAdminReports();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function returnReport(id) {
  showModal('إعادة التقرير', `
    <div class="form-group">
      <label>سبب الإعادة</label>
      <textarea id="return-notes" rows="4" placeholder="أكتب سبب إعادة التقرير..." required></textarea>
    </div>
  `, `<button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-danger" onclick="confirmReturn(${id})">إعادة التقرير</button>`);
}

async function confirmReturn(id) {
  const notes = document.getElementById('return-notes').value;
  if (!notes) { showToast('يجب كتابة سبب الإعادة', 'error'); return; }
  try {
    await API.put(`/admin/reports/${id}/status`, { status: 'returned', admin_notes: notes });
    showToast('تمت إعادة التقرير', 'success');
    closeModal();
    renderAdminReports();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
