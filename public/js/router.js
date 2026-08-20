const Router = {
  routes: {},
  currentRoute: null,

  register(path, handler) { this.routes[path] = handler; },

  navigate(path) {
    this.currentRoute = path;
    window.history.pushState({}, '', path);
    this.render();
  },

  render() {
    const path = this.currentRoute || window.location.pathname;
    const handler = this.routes[path] || this.routes['/'];
    if (handler) handler();
  },

  init() {
    window.addEventListener('popstate', () => this.render());
    this.render();
  }
};
