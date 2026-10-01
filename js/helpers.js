const nouvelId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2,'0');
const versISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const auj = () => versISO(new Date());
const ajouterJours = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate()+n); return versISO(d); };
const echapper = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateValide = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

function libelleDate(iso){
  const t = auj();
  if(iso === t) return "Aujourd'hui";
  if(iso === ajouterJours(t,1)) return 'Demain';
  if(iso === ajouterJours(t,-1)) return 'Hier';
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
}

let toastTimer = null;
// action (facultatif) : { label, fn } -> bouton dans le message (ex. « Annuler »)
function toast(message, type, action){
  const el = $('toast');
  el.textContent = message;
  el.className = 'toast actif' + (type ? ' ' + type : '');
  if(action){
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = action.label;
    b.addEventListener('click', ()=>{ el.classList.remove('actif'); clearTimeout(toastTimer); action.fn(); });
    el.appendChild(b);
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('actif'), action ? 6000 : 3500);
}
