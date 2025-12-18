(function bootstrapHouseChecker(window) {
  const app = window.HouseChecker;
  if (!app) return;

  document.addEventListener('DOMContentLoaded', () => {
    if (app.market?.init) {
      app.market.init();
    }

    if (app.deductions?.init) {
      app.deductions.init();
    }

    if (app.share?.init) {
      app.share.init();
    }
  });
})(window);
