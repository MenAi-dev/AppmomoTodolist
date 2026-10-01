function init(){
  charger();
  rendre();
  majOptionsAjout();
}
init();

// Si l'appli reste ouverte à minuit, on met à jour « Aujourd'hui / En retard »
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) rendre(); });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(e => console.error('SW', e));
  });
}
