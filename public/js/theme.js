// Apparence : thème (auto / clair / sombre) et couleur d'accent, mémorisés sur l'appareil
const THEME_CLE = 'todoTheme';
const ACCENTS = [
  ['bleu','Bleu','#0A84FF'], ['vert','Vert','#30D158'], ['violet','Violet','#BF5AF2'],
  ['orange','Orange','#FF9F0A'], ['rose','Rose','#FF375F'], ['turquoise','Turquoise','#32ADE6']
];
const reglagesTheme = { mode:'sombre', accent:'bleu' };

function chargerTheme(){
  try{
    const t = JSON.parse(localStorage.getItem(THEME_CLE) || '{}');
    if(['auto','clair','sombre'].includes(t.mode)) reglagesTheme.mode = t.mode;
    if(ACCENTS.some(a => a[0] === t.accent)) reglagesTheme.accent = t.accent;
  }catch(_){}
}
function themeClair(){
  return reglagesTheme.mode === 'clair' || (reglagesTheme.mode === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches);
}
function appliquerTheme(){
  const r = document.documentElement, clair = themeClair();
  r.dataset.theme = clair ? 'clair' : 'sombre';
  r.dataset.accent = reglagesTheme.accent;
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.content = clair ? '#F2F2F7' : '#000000';
  document.querySelectorAll('.theme-mode').forEach(b => b.classList.toggle('actif', b.dataset.mode === reglagesTheme.mode));
  document.querySelectorAll('.theme-accent').forEach(b => {
    const on = b.dataset.accent === reglagesTheme.accent;
    b.classList.toggle('actif', on); b.setAttribute('aria-pressed', on);
  });
}
function enregistrerTheme(){
  try{ localStorage.setItem(THEME_CLE, JSON.stringify(reglagesTheme)); }catch(_){}
}

(function(){
  $('themeAccents').innerHTML = ACCENTS.map(([id, nom, couleur]) =>
    `<button class="theme-accent" type="button" data-accent="${id}" style="--c:${couleur}" aria-label="${nom}" title="${nom}"></button>`).join('');

  const ouvrir = ()=>{ appliquerTheme(); $('overlayTheme').classList.add('actif'); };
  const fermer = ()=> $('overlayTheme').classList.remove('actif');
  $('btnTheme').addEventListener('click', ouvrir);
  $('themeFermer').addEventListener('click', fermer);
  $('overlayTheme').addEventListener('click', e=>{ if(e.target === $('overlayTheme')) fermer(); });
  document.addEventListener('keydown', e=>{ if(e.key === 'Escape') fermer(); });

  $('overlayTheme').addEventListener('click', e=>{
    const m = e.target.closest('.theme-mode'), a = e.target.closest('.theme-accent');
    if(m) reglagesTheme.mode = m.dataset.mode;
    else if(a) reglagesTheme.accent = a.dataset.accent;
    else return;
    enregistrerTheme(); appliquerTheme();
  });

  // En mode « Auto », on suit le réglage du téléphone en direct
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const suivre = ()=>{ if(reglagesTheme.mode === 'auto') appliquerTheme(); };
  if(mq.addEventListener) mq.addEventListener('change', suivre); else if(mq.addListener) mq.addListener(suivre);

  chargerTheme();
  appliquerTheme();
})();
