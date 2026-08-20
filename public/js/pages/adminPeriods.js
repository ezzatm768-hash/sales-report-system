async function renderAdminPeriods() {
  renderApp('<div class="loading-spinner"><div class="spinner"></div></div>', 'admin-periods');

  try {
    const periods = await API.get('/admin/periods');
    const pageHTML = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <h1 class="page-title">الفترات الزمنية</h1>
          <p class="page-subtitle">إدارة فترات التقييم</p>
        </div>
        <button class="btn btn-primary" onclick="showAddPeriodModal()">+ إضافة فترة</button>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>اسم الفترة</th>
                <th>النوع</th>
                <th>تاريخ البداية</th>
                <th>تاريخ النهاية</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${periods.length > 0 ? periods.map(p => `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td>${p.period_type === 'weekly' ? 'أسبوعي' : p.period_type === 'biweekly' ? 'كل أسبوعين' : 'شهري'}</td>
                  <td>${formatDate(p.start_date)}</td>
                  <td>${formatDate(p.end_date)}</td>
                  <td>${p.status === 'active' ? '<span class="badge badge-active">نشط</span>' : '<span class="badge badge-inactive">مغلق</span>'}</td>
                  <td class="action-btns">
                    ${p.status === 'active' ? `<button class="btn btn-sm btn-danger" onclick="closePeriod(${p.id})">إغلاق</button>` : ''}
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">لا توجد فترات</div></td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
    renderApp(pageHTML, 'admin-periods');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showAddPeriodModal() {
  showModal('إضافة فترة تقييم', `
    <form id="add-period-form">
      <div class="form-group">
        <label>اسم الفترة</label>
        <input type="text" id="period-name" placeholder="مثال: أغسطس 2026 - الأسبوع 3" required>
      </div>
      <div class="form-group">
        <label>نوع الفترة</label>
        <select id="period-type">
          <option value="monthly">شهري</option>
          <option value="weekly">أسبوعي</option>
          <option value="biweekly">كل أسبوعين</option>
        </select>
      </div>
      <div class="form-group">
        <label>تاريخ البداية</label>
        <input type="date" id="period-start" required>
      </div>
      <div class="form-group">
        <label>تاريخ النهاية</label>
        <input type="date" id="period-end" required>
      </div>
    </form>
  `, `<button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="savePeriod()">حفظ</button>`);
}

async function savePeriod() {
  const name = document.getElementById('period-name').value;
  const period_type = document.getElementById('period-type').value;
  const start_date = document.getElementById('period-start').value;
  const end_date = document.getElementById('period-end').value;

  try {
    await API.post('/admin/periods', { name, period_type, start_date, end_date });
    showToast('تم إنشاء الفترة بنجاح', 'success');
    closeModal();
    renderAdminPeriods();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function closePeriod(id) {
  if (!confirm('هل أنت متأكد من إغلاق هذه الفترة؟')) return;
  try {
    await API.put(`/admin/periods/${id}`, { status: 'closed' });
    showToast('تم إغلاق الفترة', 'success');
    renderAdminPeriods();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
