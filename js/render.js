let filtre = 'afaire';

const SVG_COCHE = '<svg viewBox="0 0 24 24"><polyline points="5 12.5 10 17.5 19 7.5"/></svg>';

function trier(a, b){
  if(a.important !== b.important) return a.important ? -1 : 1;
  if(a.date !== b.date){
    if(!a.date) return 1;
    if(!b.date) return -1;
    return a.date < b.date ? -1 : 1;
  }
  return a.creeLe - b.creeLe;
}

function htmlTache(t){
  const aujourdhui = auj();
  let meta = '';
  if(t.date){
    const cls = (!t.fait && t.date < aujourdhui) ? 'retard' : (t.date === aujourdhui ? 'auj' : '');
    meta = `<div class="tache-meta ${cls}">${echapper(libelleDate(t.date))}</div>`;
  }
  return `<div class="tache${t.fait?' fait':''}${t.important?' important':''}" data-id="${t.id}">
    <button class="coche" type="button" data-act="toggle" aria-label="${t.fait?'Marquer comme à faire':'Marquer comme faite'}">${SVG_COCHE}</button>
    <div class="tache-corps" data-act="edit"><div class="tache-titre">${echapper(t.titre)}</div>${meta}</div>
    <button class="etoile" type="button" data-act="star" aria-label="Basculer important">★</button>
    <button class="icone" type="button" data-act="edit" aria-label="Modifier">✎</button>
    <button class="icone suppr" type="button" data-act="suppr" aria-label="Supprimer">✕</button>
  </div>`;
}

function htmlGroupe(titre, liste, cls){
  if(!liste.length) return '';
  return `<div class="groupe"><div class="groupe-titre ${cls||''}"><span>${titre}</span></div>
    <div class="groupe-liste">${liste.map(htmlTache).join('')}</div></div>`;
}

function rendre(){
  const restantes = taches.filter(t=>!t.fait);
  const faites = taches.filter(t=>t.fait);
  const aujourdhui = auj();
  const enRetard = restantes.filter(t=>t.date && t.date < aujourdhui);

  // Résumé
  $('dateJour').textContent = (s => s.charAt(0).toUpperCase() + s.slice(1))(
    new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })
  );
  $('resteNb').textContent = restantes.length;
  $('resumeTotal').textContent = `sur ${taches.length} tâche${taches.length>1?'s':''}`;
  const r = $('resumeRetard');
  r.hidden = !enRetard.length;
  r.textContent = `${enRetard.length} en retard`;
  const pct = taches.length ? Math.round(faites.length / taches.length * 100) : 0;
  $('barreFill').style.width = pct + '%';
  $('barreFill').classList.toggle('complet', taches.length > 0 && pct === 100);
  $('navAFaire').textContent = restantes.length;
  $('navFaites').textContent = faites.length;

  // Liste
  if(filtre === 'analyse'){ $('liste').innerHTML = htmlAnalyse(); return; }
  let html = '';
  if(filtre === 'afaire'){
    if(!restantes.length){
      html = taches.length
        ? '<div class="vide"><b>Tout est fait 🎉</b>Profite, ou ajoute une nouvelle tâche.</div>'
        : '<div class="vide"><b>Aucune tâche</b>Écris ta première tâche ci-dessus.</div>';
    } else {
      const trie = restantes.slice().sort(trier);
      html += htmlGroupe('En retard', trie.filter(t=>t.date && t.date < aujourdhui), 'retard');
      html += htmlGroupe("Aujourd'hui", trie.filter(t=>t.date === aujourdhui));
      html += htmlGroupe('À venir', trie.filter(t=>t.date && t.date > aujourdhui));
      html += htmlGroupe('Sans date', trie.filter(t=>!t.date));
    }
  } else {
    if(!faites.length){
      html = '<div class="vide"><b>Rien ici</b>Les tâches terminées apparaîtront ici.</div>';
    } else {
      const trie = faites.slice().sort((a,b)=>(b.faitLe||0)-(a.faitLe||0));
      html = `<div class="groupe"><div class="groupe-titre"><span>${faites.length} terminée${faites.length>1?'s':''}</span>
        <button class="lien-discret" type="button" data-act="vider">Tout supprimer</button></div>
        <div class="groupe-liste">${trie.map(htmlTache).join('')}</div></div>`;
    }
  }
  $('liste').innerHTML = html;
}

function basculerFiltre(nom){
  filtre = nom;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('actif', b.dataset.filtre === nom));
  const l = $('liste');
  l.classList.remove('anim'); void l.offsetWidth; l.classList.add('anim');
  rendre();
}


// ---------- Analyse des tâches terminées ----------
function htmlAnalyse(){
  const aujourdhui = auj();
  const faites = taches.filter(t=>t.fait);
  const datees = faites.filter(t=>t.faitLe);
  if(!datees.length){
    return '<div class="vide"><b>Pas encore de données</b>Termine quelques tâches pour voir ton analyse ici.</div>';
  }
  // nombre de tâches terminées par jour
  const parJour = {};
  datees.forEach(t=>{ const j = versISO(new Date(t.faitLe)); parJour[j] = (parJour[j]||0) + 1; });
  const compte = n => { let c = 0; for(let i=0;i<n;i++) c += parJour[ajouterJours(aujourdhui,-i)] || 0; return c; };
  const nAuj = parJour[aujourdhui] || 0, n7 = compte(7), n30 = compte(30);

  // série de jours consécutifs (on tolère « rien encore fait aujourd'hui »)
  let serie = 0, d = parJour[aujourdhui] ? aujourdhui : ajouterJours(aujourdhui,-1);
  while(parJour[d]){ serie++; d = ajouterJours(d,-1); }

  // 7 derniers jours (graphique)
  const jours = [];
  for(let i=6;i>=0;i--){ const j = ajouterJours(aujourdhui,-i); jours.push({ j, n: parJour[j]||0 }); }
  const max = Math.max(1, ...jours.map(x=>x.n));
  const barres = jours.map(x=>{
    const lbl = new Date(x.j+'T12:00:00').toLocaleDateString('fr-FR',{ weekday:'short' }).replace('.','');
    return `<div class="barre-col${x.j===aujourdhui?' auj':''}">
      <div class="barre-n">${x.n||''}</div>
      <div class="barre-piste"><div class="barre-haut" style="height:${Math.round(x.n/max*100)}%"></div></div>
      <div class="barre-lbl">${echapper(lbl)}</div></div>`;
  }).join('');

  // indicateurs
  const taux = taches.length ? Math.round(faites.length / taches.length * 100) : 0;
  const avecDate = faites.filter(t=>t.date && t.faitLe);
  const dansTemps = avecDate.filter(t=>versISO(new Date(t.faitLe)) <= t.date).length;
  const moy = (n30 / 30).toFixed(1).replace('.', ',');
  let meilleur = { j:'', n:0 };
  for(let i=0;i<30;i++){ const j = ajouterJours(aujourdhui,-i); if((parJour[j]||0) > meilleur.n) meilleur = { j, n: parJour[j] }; }
  const nImp = faites.filter(t=>t.important).length;

  const ligne = (nom, val) => `<div class="stat-ligne"><span>${nom}</span><b>${val}</b></div>`;
  return `
    <div class="stats-grille">
      <div class="stat-tuile"><div class="label">Aujourd'hui</div><div class="valeur">${nAuj}</div></div>
      <div class="stat-tuile"><div class="label">7 derniers jours</div><div class="valeur">${n7}</div></div>
      <div class="stat-tuile"><div class="label">30 derniers jours</div><div class="valeur">${n30}</div></div>
      <div class="stat-tuile"><div class="label">Série en cours</div><div class="valeur">${serie}<small> jour${serie>1?'s':''}</small></div></div>
    </div>
    <div class="groupe"><div class="groupe-titre"><span>Tâches terminées par jour</span></div>
      <div class="graphique">${barres}</div></div>
    <div class="groupe"><div class="groupe-titre"><span>Détails</span></div>
      <div class="groupe-liste stat-liste">
        ${ligne('Taux de réussite', `${taux} % (${faites.length}/${taches.length})`)}
        ${avecDate.length ? ligne('Terminées dans les temps', `${Math.round(dansTemps/avecDate.length*100)} % (${dansTemps}/${avecDate.length})`) : ''}
        ${ligne('Moyenne par jour (30 j)', moy)}
        ${meilleur.n ? ligne('Meilleur jour (30 j)', `${meilleur.n} · ${echapper(libelleDate(meilleur.j))}`) : ''}
        ${ligne('Importantes terminées', nImp)}
      </div></div>`;
}
