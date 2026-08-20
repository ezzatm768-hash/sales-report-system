let currentEvaluation = { salesId: null, periodId: null, reportId: null, status: null };

async function openEvaluation(salesId, periodId, reportId, status) {
  currentEvaluation = { salesId, periodId, reportId, status };
  Router.navigate('/tl-evaluation');
}

async function renderTLEvaluation() {
  if (!currentEvaluation.salesId) { Router.navigate('/tl-dashboard'); return; }
  renderApp('<div class="loading-spinner"><div class="spinner"></div></div>', 'tl-members');

  try {
    const [fields, members] = await Promise.all([
      API.get('/team-leader/fields'),
      API.get('/team-leader/members')
    ]);

    const sales = members.find(m => m.id === currentEvaluation.salesId);
    let existingAnswers = {};

    if (currentEvaluation.reportId) {
      try {
        const report = await API.get(`/team-leader/reports/${currentEvaluation.reportId}`);
        if (report.answers) {
          report.answers.forEach(a => { existingAnswers[a.field_id] = a.answer; });
        }
      } catch (e) {}
    }

    const pageHTML = `
      <div class="page-header">
        <h1 class="page-title">نموذج التقييم</h1>
        <p class="page-subtitle">تقييم: ${sales ? sales.name : ''}</p>
      </div>

      <div class="card" style="margin-bottom:24px">
        <div class="card-body">
          <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:24px;font-weight:800;color:var(--primary)">VS Development</div>
            <div style="font-size:16px;color:var(--text-light);margin-top:4px">Sales Team Performance Report</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#f8fafc;padding:16px;border-radius:8px">
            <div><strong>Team Leader:</strong> ${API.user.name}</div>
            <div><strong>Sales:</strong> ${sales ? sales.name : ''}</div>
            <div><strong>Evaluation Period:</strong> ${currentEvaluation.periodId}</div>
            <div><strong>Status:</strong> ${statusBadge(currentEvaluation.status)}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <form id="evaluation-form">
            ${fields.map(f => `
              <div class="eval-field">
                <label>${f.field_name}</label>
                <textarea 
                  name="field_${f.id}" 
                  placeholder="اكتب ملاحظاتك هنا...">${existingAnswers[f.id] || ''}</textarea>
              </div>
            `).join('')}
          </form>
        </div>
      </div>

      <div style="margin-top:24px;display:flex;gap:12px;justify-content:flex-end">
        <button class="btn btn-outline" onclick="saveEvaluation('draft')">حفظ كمسودة</button>
        <button class="btn btn-primary" onclick="submitEvaluation()">إرسال التقرير</button>
      </div>
    `;
    renderApp(pageHTML, 'tl-members');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveEvaluation(status) {
  const form = document.getElementById('evaluation-form');
  const textareas = form.querySelectorAll('textarea');
  const answers = [];

  textareas.forEach(ta => {
    const fieldId = parseInt(ta.name.replace('field_', ''));
    answers.push({ field_id: fieldId, answer: ta.value });
  });

  try {
    if (currentEvaluation.reportId) {
      await API.put(`/team-leader/reports/${currentEvaluation.reportId}`, { answers, status });
    } else {
      const result = await API.post('/team-leader/reports', {
        sales_id: currentEvaluation.salesId,
        evaluation_period_id: currentEvaluation.periodId,
        answers,
        status
      });
      currentEvaluation.reportId = result.id;
    }
    showToast(status === 'draft' ? 'تم الحفظ كمسودة' : 'تم الحفظ', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitEvaluation() {
  if (!confirm('هل أنت متأكد من إرسال التقرير؟ لن تتمكن من التعديل لاحقاً.')) return;
  await saveEvaluation('submitted');
  showToast('تم إرسال التقرير بنجاح', 'success');
  Router.navigate('/tl-dashboard');
}
