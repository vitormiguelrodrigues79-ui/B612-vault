await import('./auth-guard.js?v=1.14');
await import('./app.js?v=1.14');
await import('./inspiration.js?v=1.14');
await import('./price-stores.js?v=1.14');
await import('./parfumo-import.js?v=1.14');
await import('./catalog-view.js?v=1.14');
const spans=document.querySelectorAll('.app-footer span');
if(spans[1])spans[1].textContent='v1.14 · última atualização 05/09/2026 · 17:55';
