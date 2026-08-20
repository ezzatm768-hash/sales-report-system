async function renderAdminFields() {
  renderApp('<div class="loading-spinner"><div class="spinner"></div></div>', 'admin-fields');

  try {
    const fields = await API.get('/admin/fields');
    const pageHTML = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <h1 class="page-title">خانات التقييم</h1>
          <p class="page-subtitle">إدارة حقول وعناصر نموذج التقييم</p>
        </div>
        <button class="btn btn-primary" onclick="showAddFieldModal()">+ إضافة خانة</button>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>اسم الخانة</th>
                <th>الوصف</th>
                <th>الترتيب</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${fields.map(f => `
                <tr>
                  <td>${f.field_order}</td>
                  <td><strong>${f.field_name}</strong></td>
                  <td>${f.field_description || '-'}</td>
                  <td>${f.field_order}</td>
                  <td>${f.active ? '<span class="badge badge-active">نشط</span>' : '<span class="badge badge-inactive">معطل</span>'}</td>
                  <td class="action-btns">
                    <button class="btn btn-sm btn-outline" onclick='showEditFieldModal(${JSON.stringify(f).replace(/'/g, "&#39;")})'>تعديل</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteField(${f.id})">حذف</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    renderApp(pageHTML, 'admin-fields');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showAddFieldModal() {
  showModal('إضافة خانة تقييم', `
    <form>
      <div class="form-group">
        <label>اسم الخانة</label>
        <input type="text" id="field-name" placeholder="أدخل اسم الخانة" required>
      </div>
      <div class="form-group">
        <label>الوصف (اختياري)</label>
        <input type="text" id="field-desc" placeholder="وصف مختصر للخانة">
      </div>
    </form>
  `, `<button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="saveField()">حفظ</button>`);
}

async function saveField() {
  const field_name = document.getElementById('field-name').value;
  const field_description = document.getElementById('field-desc').value;
  try {
    await API.post('/admin/fields', { field_name, field_description });
    showToast('تمت الإضافة بنجاح', 'success');
    closeModal();
    renderAdminFields();
  } catch (err) { showToast(err.message, 'error'); }
}

function showEditFieldModal(field) {
  showModal('تعديل الخانة', `
    <form>
      <div class="form-group">
        <label>اسم الخانة</label>
        <input type="text" id="edit-field-name" value="${field.field_name}" required>
      </div>
      <div class="form-group">
        <label>الوصف</label>
        <input type="text" id="edit-field-desc" value="${field.field_description || ''}">
      </div>
      <div class="form-group">
        <label>الترتيب</label>
        <input type="number" id="edit-field-order" value="${field.field_order}">
      </div>
      <div class="form-group">
        <label>الحالة</label>
        <select id="edit-field-active">
          <option value="1" ${field.active ? 'selected' : ''}>نشط</option>
          <option value="0" ${!field.active ? 'selected' : ''}>معطل</option>
        </select>
      </div>
    </form>
  `, `<button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="updateField(${field.id})">تحديث</button>`);
}

async function updateField(id) {
  const field_name = document.getElementById('edit-field-name').value;
  const field_description = document.getElementById('edit-field-desc').value;
  const field_order = parseInt(document.getElementById('edit-field-order').value);
  const active = parseInt(document.getElementById('edit-field-active').value);
  try {
    await API.put(`/admin/fields/${id}`, { field_name, field_description, field_order, active });
    showToast('تم التحديث', 'success');
    closeModal();
    renderAdminFields();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteField(id) {
  if (!confirm('هل أنت متأكد من الحذف؟')) return;
  try {
    await API.delete(`/admin/fields/${id}`);
    showToast('تم الحذف', 'success');
    renderAdminFields();
  } catch (err) { showToast(err.message, 'error'); }
}
