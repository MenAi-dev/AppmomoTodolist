let nouvelleDate = '';
let nouvelImportant = false;
let tacheEnEdition = null;

// --- Ajout rapide ---
function majOptionsAjout(){
  $('chipDate').classList.toggle('actif', !!nouvelleDate);
  $('chipDateTxt').textContent = nouvelleDate ? '📅 ' + libelleDate(nouvelleDate) : '📅 Date';
  $('effacerDate').hidden = !nouvelleDate;
  const ci = $('chipImportant');
  ci.classList.toggle('actif', nouvelImportant);
  ci.classList.toggle('important', nouvelImportant);
  ci.textContent = nouvelImportant ? '★ Important' : '☆ Important';
}
function reinitialiserOptions(){
  nouvelleDate = ''; nouvelImportant = false; $('inputDate').value = '';
  majOptionsAjout();
}

// Ouvre explicitement le calendrier (sur ordinateur, un clic sur le champ ne l'ouvre pas tout seul)
$('inputDate').addEventListener('click', e=>{
  try{ if(e.target.showPicker) e.target.showPicker(); }catch(_){ /* déjà ouvert ou non supporté */ }
});
$('inputDate').addEventListener('change', e=>{ nouvelleDate = e.target.value; majOptionsAjout(); });
$('effacerDate').addEventListener('click', ()=>{ nouvelleDate = ''; $('inputDate').value = ''; majOptionsAjout(); });
$('chipImportant').addEventListener('click', ()=>{ nouvelImportant = !nouvelImportant; majOptionsAjout(); });

$('formAjout').addEventListener('submit', e=>{
  e.preventDefault();
  const titre = $('inputTitre').value.trim();
  if(!titre){ $('inputTitre').focus(); return; }
  taches.push({ id:nouvelId(), titre, fait:false, important:nouvelImportant, date:nouvelleDate, creeLe:Date.now(), faitLe:null });
  sauvegarder();
  $('inputTitre').value = '';
  reinitialiserOptions();
  if(filtre !== 'afaire') basculerFiltre('afaire'); else rendre();
  $('inputTitre').focus(); // garde le clavier ouvert pour enchaîner
});

// --- Navigation ---
$('nav').addEventListener('click', e=>{
  const b = e.target.closest('.nav-btn');
  if(b && b.dataset.filtre !== filtre) basculerFiltre(b.dataset.filtre);
});

// --- Actions sur la liste ---
$('liste').addEventListener('click', e=>{
  const el = e.target.closest('[data-act]');
  if(!el) return;
  const act = el.dataset.act;

  if(act === 'vider'){
    const faites = taches.filter(t=>t.fait);
    if(!faites.length) return;
    const sauv = taches.slice();
    taches = taches.filter(t=>!t.fait);
    sauvegarder(); rendre();
    toast(`${faites.length} tâche${faites.length>1?'s':''} supprimée${faites.length>1?'s':''}`, '', { label:'Annuler', fn:()=>{ taches = sauv; sauvegarder(); rendre(); } });
    return;
  }

  const ligne = el.closest('.tache');
  const t = ligne && taches.find(x=>x.id === ligne.dataset.id);
  if(!t) return;

  if(act === 'toggle'){
    t.fait = !t.fait;
    t.faitLe = t.fait ? Date.now() : null;
    sauvegarder(); rendre();
  } else if(act === 'star'){
    t.important = !t.important;
    sauvegarder(); rendre();
  } else if(act === 'edit'){
    ouvrirEdition(t);
  } else if(act === 'suppr'){
    supprimerTache(t.id);
  }
});

function supprimerTache(id){
  const i = taches.findIndex(x=>x.id === id);
  if(i < 0) return;
  const [supprimee] = taches.splice(i,1);
  sauvegarder(); rendre();
  toast('Tâche supprimée', '', { label:'Annuler', fn:()=>{ taches.splice(Math.min(i, taches.length), 0, supprimee); sauvegarder(); rendre(); } });
}

// --- Modifier une tâche ---
function ouvrirEdition(t){
  tacheEnEdition = t.id;
  $('editTitre').value = t.titre;
  $('editDate').value = t.date;
  $('editImportant').value = t.important ? '1' : '0';
  $('overlayEdit').classList.add('actif');
}
function fermerEdition(){ $('overlayEdit').classList.remove('actif'); tacheEnEdition = null; }

$('editAnnuler').addEventListener('click', fermerEdition);
$('editValider').addEventListener('click', ()=>{
  const t = taches.find(x=>x.id === tacheEnEdition);
  const titre = $('editTitre').value.trim();
  if(!t) return fermerEdition();
  if(!titre){ toast('Le texte ne peut pas être vide', 'alerte'); return; }
  t.titre = titre;
  t.date = $('editDate').value;
  t.important = $('editImportant').value === '1';
  sauvegarder(); rendre(); fermerEdition();
});
$('editSuppr').addEventListener('click', ()=>{
  const id = tacheEnEdition;
  fermerEdition();
  if(id) supprimerTache(id);
});
$('editTitre').addEventListener('keydown', e=>{ if(e.key === 'Enter') $('editValider').click(); });

// --- Sauvegarde ---
function fermerDonnees(){ $('overlayDonnees').classList.remove('actif'); }
$('btnDonnees').addEventListener('click', ()=>$('overlayDonnees').classList.add('actif'));
$('donneesFermer').addEventListener('click', fermerDonnees);
$('btnExport').addEventListener('click', exporter);
$('btnImport').addEventListener('click', ()=>$('fichierImport').click());
$('fichierImport').addEventListener('change', e=>{
  if(e.target.files[0]) importer(e.target.files[0]);
  e.target.value = '';
});

// --- Fermeture des feuilles (clic à côté, Échap) ---
document.querySelectorAll('.overlay').forEach(o=>{
  o.addEventListener('click', e=>{ if(e.target === o){ fermerEdition(); fermerDonnees(); } });
});
document.addEventListener('keydown', e=>{ if(e.key === 'Escape'){ fermerEdition(); fermerDonnees(); } });
