function renderLoginPage() {
  document.getElementById('app').innerHTML = `
    <div class="login-container">
      <div class="login-box">
        <div class="login-logo">VS Development</div>
        <div class="login-subtitle">Sales Team Evaluation System</div>
        <form id="login-form">
          <div class="form-group">
            <label>اسم المستخدم</label>
            <input type="text" id="login-username" placeholder="أدخل اسم المستخدم" required>
          </div>
          <div class="form-group">
            <label>كلمة المرور</label>
            <input type="password" id="login-password" placeholder="أدخل كلمة المرور" required>
          </div>
          <button type="submit" class="btn btn-primary">تسجيل الدخول</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
      const data = await API.post('/auth/login', { username, password });
      API.setAuth(data.token, data.user);
      showToast('تم تسجيل الدخول بنجاح', 'success');
      if (data.user.role === 'admin') {
        Router.navigate('/admin-dashboard');
      } else {
        Router.navigate('/tl-dashboard');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
