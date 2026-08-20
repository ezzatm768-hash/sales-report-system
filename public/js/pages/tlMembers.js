async function renderTLMembers() {
  renderApp('<div class="loading-spinner"><div class="spinner"></div></div>', 'tl-members');

  try {
    const members = await API.get('/team-leader/members');
    const pageHTML = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <h1 class="page-title">أعضاء الفريق</h1>
          <p class="page-subtitle">إدارة أعضاء فريق المبيعات</p>
        </div>
        <button class="btn btn-primary" onclick="showAddMemberModal()">+ إضافة عضو</button>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الهاتف</th>
                <th>تاريخ الالتحاق</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${members.length > 0 ? members.map(m => `
                <tr>
                  <td><strong>${m.name}</strong></td>
                  <td>${m.phone || '-'}</td>
                  <td>${formatDate(m.join_date)}</td>
                  <td class="action-btns">
                    <button class="btn btn-sm btn-outline" onclick='showEditMemberModal(${JSON.stringify(m).replace(/'/g, "&#39;")})'>تعديل</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMember(${m.id})">حذف</button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="4" class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">لا يوجد أعضاء بعد. أضف عضو جديد.</div></td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
    renderApp(pageHTML, 'tl-members');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showAddMemberModal() {
  showModal('إضافة عضو جديد', `
    <form>
      <div class="form-group">
        <label>اسم Sales</label>
        <input type="text" id="member-name" placeholder="أدخل الاسم" required>
      </div>
      <div class="form-group">
        <label>رقم الهاتف (اختياري)</label>
        <input type="text" id="member-phone" placeholder="أدخل رقم الهاتف">
      </div>
      <div class="form-group">
        <label>تاريخ الالتحاق</label>
        <input type="date" id="member-join-date" value="${new Date().toISOString().split('T')[0]}">
      </div>
    </form>
  `, `<button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="saveMember()">حفظ</button>`);
}

async function saveMember() {
  const name = document.getElementById('member-name').value;
  const phone = document.getElementById('member-phone').value;
  const join_date = document.getElementById('member-join-date').value;

  try {
    await API.post('/team-leader/members', { name, phone, join_date });
    showToast('تمت إضافة العضو بنجاح', 'success');
    closeModal();
    renderTLMembers();
  } catch (err) { showToast(err.message, 'error'); }
}

function showEditMemberModal(member) {
  showModal('تعديل العضو', `
    <form>
      <div class="form-group">
        <label>الاسم</label>
        <input type="text" id="edit-member-name" value="${member.name}" required>
      </div>
      <div class="form-group">
        <label>الهاتف</label>
        <input type="text" id="edit-member-phone" value="${member.phone || ''}">
      </div>
      <div class="form-group">
        <label>تاريخ الالتحاق</label>
        <input type="date" id="edit-member-join-date" value="${member.join_date}">
      </div>
    </form>
  `, `<button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="updateMember(${member.id})">تحديث</button>`);
}

async function updateMember(id) {
  const name = document.getElementById('edit-member-name').value;
  const phone = document.getElementById('edit-member-phone').value;
  const join_date = document.getElementById('edit-member-join-date').value;

  try {
    await API.put(`/team-leader/members/${id}`, { name, phone, join_date });
    showToast('تم التحديث', 'success');
    closeModal();
    renderTLMembers();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteMember(id) {
  if (!confirm('هل أنت متأكد من حذف هذا العضو؟')) return;
  try {
    await API.delete(`/team-leader/members/${id}`);
    showToast('تم الحذف', 'success');
    renderTLMembers();
  } catch (err) { showToast(err.message, 'error'); }
}
