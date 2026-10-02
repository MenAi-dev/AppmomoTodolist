let nouvelleDate = '';
let nouvelImportant = false;
let nouvelleRepet = '';
let sousEdition = []; // brouillon des sous-tâches pendant que la modale est ouverte
let ignorerAuto = false; // l'utilisateur refuse la détection automatique pour cette saisie
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
  const cr = $('chipRepeter');
  cr.classList.toggle('actif', !!nouvelleRepet);
  cr.textContent = '🔁 ' + (nouvelleRepet ? LIBELLES_REPET[nouvelleRepet] : 'Répéter');
}
function reinitialiserOptions(){
  nouvelleDate = ''; nouvelImportant = false; nouvelleRepet = ''; ignorerAuto = false; $('inputDate').value = '';
  majOptionsAjout(); majApercu();
}

$('inputDate').addEventListener('change', e=>{ nouvelleDate = e.target.value; majOptionsAjout(); });
$('effacerDate').addEventListener('click', ()=>{ nouvelleDate = ''; $('inputDate').value = ''; majOptionsAjout(); });
// --- Détection automatique dans le texte saisi ---
function majApercu(){
  const zone = $('apercu');
  const a = ignorerAuto ? null : analyserSaisie($('inputTitre').value.trim());
  if(!a || !a.trouve){ zone.hidden = true; return; }
  const parts = [];
  if(a.date) parts.push(libelleDate(a.date));
  if(a.important) parts.push('★ Important');
  if(a.repeter) parts.push('🔁 ' + LIBELLES_REPET[a.repeter]);
  zone.innerHTML = `<span>Détecté : <b>${echapper(parts.join(' · '))}</b></span><button type="button" id="ignorerAuto">Ignorer</button>`;
  zone.hidden = false;
}
$('inputTitre').addEventListener('input', majApercu);
$('apercu').addEventListener('click', e=>{
  if(e.target.id === 'ignorerAuto'){ ignorerAuto = true; majApercu(); $('inputTitre').focus(); }
});

$('chipImportant').addEventListener('click', ()=>{ nouvelImportant = !nouvelImportant; majOptionsAjout(); });
// Un tap fait défiler : Répéter -> Chaque jour -> Chaque semaine -> Chaque mois -> Répéter
$('chipRepeter').addEventListener('click', ()=>{
  nouvelleRepet = REPETITIONS[(REPETITIONS.indexOf(nouvelleRepet) + 1) % REPETITIONS.length];
  if(nouvelleRepet && !nouvelleDate){ nouvelleDate = auj(); $('inputDate').value = nouvelleDate; } // une tâche récurrente a besoin d'une date
  majOptionsAjout();
});

$('formAjout').addEventListener('submit', e=>{
  e.preventDefault();
  const saisie = $('inputTitre').value.trim();
  if(!saisie){ $('inputTitre').focus(); return; }
  // Les puces choisies à la main passent avant ce qui est détecté dans le texte
  const auto = ignorerAuto ? null : analyserSaisie(saisie);
  const detecte = !!(auto && auto.trouve);
  const titre = detecte ? auto.titre : saisie;
  const important = nouvelImportant || (detecte && auto.important);
  const repeter = nouvelleRepet || (detecte ? auto.repeter : '');
  let date = nouvelleDate || (detecte ? auto.date : '');
  if(repeter && !date) date = auj();
  taches.push({ id:nouvelId(), titre, fait:false, important, date, repeter, suiteId:'', sous:[], creeLe:Date.now(), faitLe:null });
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
    const aArchiver = taches.filter(t=>t.fait && !t.archive);
    if(!aArchiver.length) return;
    aArchiver.forEach(t=>{ t.archive = true; });
    sauvegarder(); rendre();
    const n = aArchiver.length;
    toast(`${n} tâche${n>1?'s':''} archivée${n>1?'s':''} · stats conservées`, '',
      { label:'Annuler', fn:()=>{ aArchiver.forEach(t=>{ t.archive = false; }); sauvegarder(); rendre(); } });
    return;
  }

  if(act === 'reporter-tout'){
    const aujourdhui = auj();
    reporterTaches(taches.filter(t=>!t.fait && t.date && t.date < aujourdhui), 0);
    return;
  }

  const ligne = el.closest('.tache');
  const t = ligne && taches.find(x=>x.id === ligne.dataset.id);
  if(!t) return;

  if(act === 'toggle'){
    basculerFait(t);
  } else if(act === 'star'){
    t.important = !t.important;
    sauvegarder(); rendre();
  } else if(act === 'edit'){
    ouvrirEdition(t);
  } else if(act === 'suppr'){
    supprimerTache(t.id);
  } else if(act === 'sous-voir'){
    if(ouverts.has(t.id)) ouverts.delete(t.id); else ouverts.add(t.id);
    rendre();
  } else if(act === 'sous'){
    basculerSous(t, el.dataset.sid);
  } else if(act === 'reporter'){
    reporterTaches([t], Number(el.dataset.jours) || 0);
  }
});

// Cocher / décocher une étape de la checklist
function basculerSous(t, sid){
  const s = (t.sous || []).find(x=>x.id === sid);
  if(!s) return;
  s.fait = !s.fait;
  sauvegarder(); rendre();
  if(s.fait && !t.fait && t.sous.every(x=>x.fait)){
    toast('Toutes les étapes sont faites', '', { label:'Terminer la tâche', fn:()=>{ if(!t.fait) basculerFait(t); } });
  }
}

// Terminer / rouvrir une tâche. Une tâche récurrente crée sa prochaine occurrence.
function basculerFait(t){
  if(!t.fait){
    t.fait = true; t.faitLe = Date.now();
    let suivante = null;
    if(t.repeter){
      suivante = { id:nouvelId(), titre:t.titre, fait:false, important:t.important,
        date:prochaineDate(t.date, t.repeter), repeter:t.repeter, suiteId:'', creeLe:Date.now(), faitLe:null,
        sous:(t.sous || []).map(s=>({ id:nouvelId(), titre:s.titre, fait:false })) }; // checklist remise à zéro
      taches.push(suivante);
      t.suiteId = suivante.id;
    }
    sauvegarder(); rendre();
    if(suivante){
      toast(`Prochaine occurrence : ${libelleDate(suivante.date).toLowerCase()}`, '',
        { label:'Annuler', fn:()=>{ if(t.fait) basculerFait(t); } });
    }
  } else {
    t.fait = false; t.faitLe = null;
    if(t.suiteId){ // on retire l'occurrence suivante si elle n'a pas été traitée
      const i = taches.findIndex(x=>x.id === t.suiteId && !x.fait);
      if(i >= 0) taches.splice(i,1);
      t.suiteId = '';
    }
    sauvegarder(); rendre();
  }
}

// Reporte des tâches à aujourd'hui (0) ou plus tard (n jours), avec annulation
function reporterTaches(liste, jours){
  if(!liste.length) return;
  const cible = ajouterJours(auj(), jours);
  const avant = liste.map(t=>({ t, date:t.date }));
  liste.forEach(t=>{ t.date = cible; });
  sauvegarder(); rendre();
  const n = liste.length;
  toast(`${n>1 ? n + ' tâches reportées' : 'Tâche reportée'} pour ${libelleDate(cible).toLowerCase()}`, '',
    { label:'Annuler', fn:()=>{ avant.forEach(a=>{ a.t.date = a.date; }); sauvegarder(); rendre(); } });
}

function supprimerTache(id){
  const i = taches.findIndex(x=>x.id === id);
  if(i < 0) return;
  if(taches[i].fait){ // une tâche terminée est archivée : elle reste dans l'analyse
    const t = taches[i];
    t.archive = true;
    sauvegarder(); rendre();
    toast('Tâche supprimée', '', { label:'Annuler', fn:()=>{ t.archive = false; sauvegarder(); rendre(); } });
    return;
  }
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
  $('editRepeter').value = t.repeter || '';
  sousEdition = (t.sous || []).map(s=>({ ...s }));
  dessinerSousEdition();
  $('editSousNouvelle').value = '';
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
  const nouvelle = $('editSousNouvelle').value.trim();
  if(nouvelle && sousEdition.length < MAX_SOUS) sousEdition.push({ id:nouvelId(), titre:nouvelle.slice(0,140), fait:false });
  t.sous = nettoyerSous(sousEdition);
  t.repeter = $('editRepeter').value;
  if(t.repeter && !t.date) t.date = auj();
  sauvegarder(); rendre(); fermerEdition();
});
$('editSuppr').addEventListener('click', ()=>{
  const id = tacheEnEdition;
  fermerEdition();
  if(id) supprimerTache(id);
});
// --- Sous-tâches dans la modale ---
function dessinerSousEdition(){
  $('editSous').innerHTML = sousEdition.map((s,i)=>`<div class="sous-edit">
    <button type="button" class="sous-coche-edit${s.fait ? ' fait' : ''}" data-sact="fait" data-i="${i}" aria-label="Basculer la sous-tâche"></button>
    <input type="text" maxlength="140" value="${echapper(s.titre)}" data-i="${i}" aria-label="Sous-tâche">
    <button type="button" class="icone suppr" data-sact="suppr" data-i="${i}" aria-label="Supprimer la sous-tâche">✕</button>
  </div>`).join('');
}
function ajouterSousEdition(){
  const champ = $('editSousNouvelle'), titre = champ.value.trim();
  if(!titre) return;
  if(sousEdition.length >= MAX_SOUS){ toast(`${MAX_SOUS} sous-tâches maximum`, 'alerte'); return; }
  sousEdition.push({ id:nouvelId(), titre:titre.slice(0,140), fait:false });
  champ.value = '';
  dessinerSousEdition();
  champ.focus();
}
$('editSousNouvelle').addEventListener('keydown', e=>{ if(e.key === 'Enter'){ e.preventDefault(); ajouterSousEdition(); } });
$('editSous').addEventListener('input', e=>{
  const i = e.target.dataset.i;
  if(i !== undefined && sousEdition[i]) sousEdition[i].titre = e.target.value;
});
$('editSous').addEventListener('keydown', e=>{ if(e.key === 'Enter'){ e.preventDefault(); $('editSousNouvelle').focus(); } });
$('editSous').addEventListener('click', e=>{
  const b = e.target.closest('[data-sact]');
  if(!b) return;
  const i = Number(b.dataset.i);
  if(b.dataset.sact === 'fait') sousEdition[i].fait = !sousEdition[i].fait;
  else sousEdition.splice(i, 1);
  dessinerSousEdition();
});

$('editTitre').addEventListener('keydown', e=>{ if(e.key === 'Enter') $('editValider').click(); });

// --- Sauvegarde ---
function fermerDonnees(){ $('overlayDonnees').classList.remove('actif'); }
function majBoutonHistorique(){
  const n = taches.filter(t=>t.archive).length;
  $('btnHistorique').hidden = !n;
  $('btnHistorique').textContent = `Effacer l'historique archivé (${n})`;
}
$('btnDonnees').addEventListener('click', ()=>{ majBoutonHistorique(); $('overlayDonnees').classList.add('actif'); });
$('btnHistorique').addEventListener('click', ()=>{
  const n = taches.filter(t=>t.archive).length;
  if(!n) return;
  if(!confirm(`Effacer définitivement ${n} tâche${n>1?'s':''} archivée${n>1?'s':''} ? Elles disparaîtront aussi de l'onglet Analyse.`)) return;
  taches = taches.filter(t=>!t.archive);
  sauvegarder(); rendre(); fermerDonnees();
  toast('Historique effacé');
});
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
