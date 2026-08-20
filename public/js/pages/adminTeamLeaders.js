async function renderAdminTeamLeaders() {
  renderApp('<div class="loading-spinner"><div class="spinner"></div></div>', 'admin-team-leaders');

  try {
    const leaders = await API.get('/admin/team-leaders');
    const pageHTML = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <h1 class="page-title">Team Leaders</h1>
          <p class="page-subtitle">إدارة قادة فرق المبيعات</p>
        </div>
        <button class="btn btn-primary" onclick="showAddTeamLeaderModal()">+ إضافة Leader</button>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>اسم المستخدم</th>
                <th>الفريق</th>
                <th>عدد الأعضاء</th>
                <th>تاريخ الإنشاء</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${leaders.length > 0 ? leaders.map(l => `
                <tr>
                  <td><strong>${l.name}</strong></td>
                  <td>${l.username}</td>
                  <td>${l.team_name || '-'}</td>
                  <td>${l.member_count}</td>
                  <td>${formatDate(l.created_at)}</td>
                  <td class="action-btns">
                    <button class="btn btn-sm btn-outline" onclick="showEditTeamLeaderModal(${l.id}, '${l.name}', '${l.username}')">تعديل</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTeamLeader(${l.id})">حذف</button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">لا يوجد Team Leaders بعد</div></td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
    renderApp(pageHTML, 'admin-team-leaders');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showAddTeamLeaderModal() {
  showModal('إضافة Team Leader', `
    <form id="add-tl-form">
      <div class="form-group">
        <label>الاسم الكامل</label>
        <input type="text" id="tl-name" placeholder="أدخل الاسم" required>
      </div>
      <div class="form-group">
        <label>اسم المستخدم</label>
        <input type="text" id="tl-username" placeholder="أدخل اسم المستخدم" required>
      </div>
      <div class="form-group">
        <label>كلمة المرور</label>
        <input type="password" id="tl-password" placeholder="أدخل كلمة المرور" required>
      </div>
    </form>
  `, `<button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="saveTeamLeader()">حفظ</button>`);
}

async function saveTeamLeader() {
  const name = document.getElementById('tl-name').value;
  const username = document.getElementById('tl-username').value;
  const password = document.getElementById('tl-password').value;

  try {
    await API.post('/admin/team-leaders', { name, username, password });
    showToast('تم إضافة Team Leader بنجاح', 'success');
    closeModal();
    renderAdminTeamLeaders();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showEditTeamLeaderModal(id, name, username) {
  showModal('تعديل Team Leader', `
    <form id="edit-tl-form">
      <div class="form-group">
        <label>الاسم</label>
        <input type="text" id="edit-tl-name" value="${name}" required>
      </div>
      <div class="form-group">
        <label>اسم المستخدم</label>
        <input type="text" id="edit-tl-username" value="${username}" required>
      </div>
    </form>
  `, `<button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="updateTeamLeader(${id})">تحديث</button>`);
}

async function updateTeamLeader(id) {
  const name = document.getElementById('edit-tl-name').value;
  const username = document.getElementById('edit-tl-username').value;

  try {
    await API.put(`/admin/team-leaders/${id}`, { name, username });
    showToast('تم التحديث بنجاح', 'success');
    closeModal();
    renderAdminTeamLeaders();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTeamLeader(id) {
  if (!confirm('هل أنت متأكد من الحذف؟')) return;
  try {
    await API.delete(`/admin/team-leaders/${id}`);
    showToast('تم الحذف بنجاح', 'success');
    renderAdminTeamLeaders();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
