// Notifications push : l'app envoie ses rappels à un petit serveur (Netlify) qui les livre à l'heure,
// même quand l'app est fermée.
const CLE_PUBLIQUE_VAPID = 'BKL_JIgsZUanroLSzkAXZI4uE01bqbMO7lT86zjAPRHbzUSURs_81FihDGKw4Ls8VOlRQvdLrFnNDKRkajZpkNU';
const CLE_PUSH = 'todoPush';

const pushSupporte = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const pushActif = () => pushSupporte() && Notification.permission === 'granted' && localStorage.getItem(CLE_PUSH) === '1';

function cleEnOctets(b64){
  const s = (b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const brut = atob(s);
  return Uint8Array.from(brut, c => c.charCodeAt(0));
}

async function abonnement(creer){
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if(!sub && creer) sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:cleEnOctets(CLE_PUBLIQUE_VAPID) });
  return sub;
}

// À appeler depuis un geste de l'utilisateur (iOS l'exige pour la demande d'autorisation)
async function activerPush(){
  if(!pushSupporte()){ toast("Ajoute d'abord l'app à l'écran d'accueil (Partager → Sur l'écran d'accueil)", 'danger'); return false; }
  const perm = await Notification.requestPermission();
  if(perm !== 'granted'){ majEtatNotif(); return false; }
  try{
    await abonnement(true);
    localStorage.setItem(CLE_PUSH, '1');
    await synchroniserRappels();
    majEtatNotif();
    return true;
  }catch(e){
    console.error('Push', e);
    toast("Impossible d'activer les notifications", 'danger');
    return false;
  }
}

let timerSync = null;
function planifierSync(){
  if(!pushActif()) return;
  clearTimeout(timerSync);
  timerSync = setTimeout(synchroniserRappels, 1500);
}

async function synchroniserRappels(){
  if(!pushActif()) return;
  try{
    const sub = await abonnement(true); // se réabonne si iOS a supprimé l'abonnement
    const now = Date.now();
    const items = rappelsActifs()
      .filter(t => momentDe(t) + 10 * 60000 > now)
      .map(t => ({ id:t.id, titre:t.titre.slice(0, 140), heure:t.heure, alerte:alerteDe(t), moment:momentDe(t) }));
    const rep = await fetch('/api/rappels', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ subscription:sub.toJSON(), items }) });
    if(!rep.ok) console.error('Synchronisation des rappels refusée', rep.status);
  }catch(e){ console.error('Synchronisation des rappels', e); } // hors ligne : reprise à la prochaine modification
}

// --- Réglage dans la feuille « Sauvegarde » ---
function etatNotif(){
  if(!pushSupporte()) return { txt:"Indisponible ici. Sur iPhone : Partager → Sur l'écran d'accueil, puis ouvre l'app depuis l'icône.", actif:false, test:false };
  if(Notification.permission === 'denied') return { txt:"Refusées. Réactive-les dans Réglages → Notifications → Mes tâches.", actif:false, test:false };
  if(pushActif()) return { txt:"Activées ✓ Tes rappels sont livrés à l'heure, même app fermée.", actif:true, test:true };
  return { txt:"Désactivées. Active-les pour recevoir tes rappels app fermée.", actif:false, test:false };
}
function majEtatNotif(){
  const e = etatNotif();
  $('notifEtat').textContent = e.txt;
  $('btnNotif').hidden = e.actif || (pushSupporte() && Notification.permission === 'denied');
  $('btnNotifTest').hidden = !e.test;
}
$('btnNotif').addEventListener('click', activerPush);
$('btnNotifTest').addEventListener('click', async () => {
  const b = $('btnNotifTest'); b.disabled = true;
  toast('Verrouille ton iPhone : la notification arrive dans 5 s');
  try{
    const sub = await abonnement(false);
    const rep = await fetch('/api/rappels', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ action:'test', subscription:sub.toJSON() }) });
    if(!rep.ok){ const d = await rep.json().catch(() => ({})); toast('Test échoué : ' + (d.erreur || rep.status), 'danger'); }
  }catch(_){ toast('Test impossible (hors ligne ?)', 'danger'); }
  b.disabled = false;
});

document.addEventListener('visibilitychange', () => { if(!document.hidden) planifierSync(); });
planifierSync();
