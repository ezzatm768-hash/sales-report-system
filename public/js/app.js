(function() {
  // Register routes
  Router.register('/', renderLoginPage);
  Router.register('/admin-dashboard', renderAdminDashboard);
  Router.register('/admin-team-leaders', renderAdminTeamLeaders);
  Router.register('/admin-reports', renderAdminReports);
  Router.register('/admin-report-view', renderReportView);
  Router.register('/admin-periods', renderAdminPeriods);
  Router.register('/admin-fields', renderAdminFields);
  Router.register('/admin-history', renderAdminEmployeeHistory);
  Router.register('/tl-dashboard', renderTLDashboard);
  Router.register('/tl-members', renderTLMembers);
  Router.register('/tl-evaluation', renderTLEvaluation);
  Router.register('/tl-reports', renderTLReports);

  // Check auth
  if (API.token && API.user) {
    if (API.user.role === 'admin') {
      if (!window.location.pathname.startsWith('/admin')) {
        Router.navigate('/admin-dashboard');
      } else {
        Router.navigate(window.location.pathname);
      }
    } else {
      if (!window.location.pathname.startsWith('/tl')) {
        Router.navigate('/tl-dashboard');
      } else {
        Router.navigate(window.location.pathname);
      }
    }
  } else {
    Router.navigate('/');
  }
})();
