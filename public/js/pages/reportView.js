let currentReportId = null;
let currentReportRole = null;

function viewAdminReport(id) {
  currentReportId = id;
  currentReportRole = 'admin';
  Router.navigate('/admin-report-view');
}

async function renderReportView() {
  if (!currentReportId) { Router.navigate('/'); return; }
  renderApp('<div class="loading-spinner"><div class="spinner"></div></div>', currentReportRole === 'admin' ? 'admin-reports' : 'tl-reports');

  try {
    const url = currentReportRole === 'admin' ? `/admin/reports/${currentReportId}` : `/team-leader/reports/${currentReportId}`;
    const report = await API.get(url);

    const pageHTML = `
      <div style="margin-bottom:20px;display:flex;gap:12px;justify-content:space-between;align-items:center">
        <button class="btn btn-outline" onclick="history.back()">← رجوع</button>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-primary" onclick="printReport()">طباعة</button>
        </div>
      </div>

      <div class="card">
        <div class="report-preview" id="report-content">
          <div class="report-header">
            <div class="report-company">VS Development</div>
            <div class="report-title">Sales Team Performance Report</div>
          </div>

          <div class="report-info">
            <div class="report-info-item"><strong>Team Leader:</strong> ${report.team_leader_name}</div>
            <div class="report-info-item"><strong>Sales:</strong> ${report.sales_name}</div>
            <div class="report-info-item"><strong>Phone:</strong> ${report.sales_phone || '-'}</div>
            <div class="report-info-item"><strong>Evaluation Period:</strong> ${report.period_name}</div>
            <div class="report-info-item"><strong>Report Date:</strong> ${formatDate(report.created_at)}</div>
            <div class="report-info-item"><strong>Status:</strong> ${statusBadge(report.status)}</div>
          </div>

          ${report.answers && report.answers.length > 0 ? report.answers.map(a => `
            <div class="report-field">
              <div class="report-field-name">${a.field_name}</div>
              <div class="report-field-answer">${a.answer || 'لا توجد ملاحظات'}</div>
            </div>
          `).join('') : '<p style="text-align:center;color:var(--text-light);padding:40px">لم يتم ملء التقرير بعد</p>'}

          ${report.admin_notes ? `
            <div style="margin-top:24px;padding:16px;background:#fff3e0;border-radius:8px;border-right:4px solid var(--warning)">
              <strong>ملاحظات المراجعة:</strong>
              <div style="margin-top:8px;line-height:1.6">${report.admin_notes}</div>
            </div>
          ` : ''}

          <div class="report-footer">
            <div class="report-signature">
              <div class="report-signature-line">Team Leader Signature / Confirmation</div>
            </div>
            <div class="report-signature">
              <div class="report-signature-line">Admin Review</div>
            </div>
          </div>
        </div>
      </div>
    `;
    renderApp(pageHTML, currentReportRole === 'admin' ? 'admin-reports' : 'tl-reports');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function printReport() {
  const content = document.getElementById('report-content').innerHTML;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>VS Development Report</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #1a1a2e; direction: rtl; }
        .report-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1a237e; padding-bottom: 20px; }
        .report-company { font-size: 28px; font-weight: 800; color: #1a237e; }
        .report-title { font-size: 18px; color: #64748b; margin-top: 8px; }
        .report-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; padding: 16px; background: #f8fafc; border-radius: 8px; }
        .report-info-item { font-size: 14px; }
        .report-field { margin-bottom: 20px; }
        .report-field-name { font-weight: 700; color: #1a237e; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        .report-field-answer { font-size: 14px; line-height: 1.8; white-space: pre-wrap; }
        .badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-draft { background: #fff3e0; color: #e65100; }
        .badge-submitted { background: #e3f2fd; color: #1565c0; }
        .badge-reviewed { background: #e8f5e9; color: #2e7d32; }
        .badge-returned { background: #ffebee; color: #c62828; }
        .report-footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; }
        .report-signature-line { width: 200px; border-top: 1px solid #1a1a2e; margin-top: 60px; padding-top: 8px; font-size: 13px; color: #64748b; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>${content}</body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}
