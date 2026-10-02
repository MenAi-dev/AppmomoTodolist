const CLE_STOCKAGE = 'todoData';
const MAX_SOUS = 30; // sous-tâches max par tâche
let taches = []; // { id, titre, fait, important, date, repeter, suiteId, archive, sous:[{id,titre,fait}], creeLe, faitLe }

function nettoyerSous(liste){
  if(!Array.isArray(liste)) return [];
  return liste.map(s => (s && typeof s.titre === 'string' && s.titre.trim()) ? {
    id: typeof s.id === 'string' && s.id ? s.id : nouvelId(),
    titre: s.titre.trim().slice(0,140),
    fait: !!s.fait
  } : null).filter(Boolean).slice(0, MAX_SOUS);
}

function nettoyerTache(t){
  if(!t || typeof t.titre !== 'string' || !t.titre.trim()) return null;
  return {
    id: typeof t.id === 'string' && t.id ? t.id : nouvelId(),
    titre: t.titre.trim().slice(0,140),
    fait: !!t.fait,
    important: !!t.important,
    date: dateValide(t.date) ? t.date : '',
    repeter: REPETITIONS.includes(t.repeter) ? t.repeter : '',
    suiteId: typeof t.suiteId === 'string' ? t.suiteId : '',
    archive: !!t.archive && !!t.fait, // seules les tâches terminées s'archivent
    sous: nettoyerSous(t.sous),
    creeLe: typeof t.creeLe === 'number' ? t.creeLe : Date.now(),
    faitLe: typeof t.faitLe === 'number' ? t.faitLe : null
  };
}

function charger(){
  try{
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if(brut){
      const data = JSON.parse(brut);
      taches = (Array.isArray(data.taches) ? data.taches : []).map(nettoyerTache).filter(Boolean);
      // L'historique archivé (utile à l'analyse) est purgé après un an pour ne pas remplir le stockage
      const limite = Date.now() - 365 * 86400000;
      taches = taches.filter(t => !(t.archive && (t.faitLe || t.creeLe) < limite));
    }
  }catch(e){ console.error('Erreur de lecture des données', e); taches = []; }
}

function sauvegarder(){
  try{
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ taches }));
  }catch(e){
    console.error('Erreur de sauvegarde', e);
    toast("Impossible d'enregistrer (stockage plein ou bloqué)", 'danger');
  }
}

// --- Export / import ---
function exporter(){
  const blob = new Blob([JSON.stringify({ app:'mes-taches', exporteLe:new Date().toISOString(), taches }, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `taches-${auj()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
  toast('Sauvegarde exportée');
}

function importer(fichier){
  const lecteur = new FileReader();
  lecteur.onload = () => {
    try{
      const data = JSON.parse(lecteur.result);
      const liste = (Array.isArray(data) ? data : data.taches);
      if(!Array.isArray(liste)) throw new Error('format');
      const propres = liste.map(nettoyerTache).filter(Boolean);
      const nActuelles = taches.filter(t=>!t.archive).length, nImportees = propres.filter(t=>!t.archive).length;
      if(!confirm(`Remplacer tes ${nActuelles} tâche(s) actuelle(s) par les ${nImportees} de cette sauvegarde ?`)) return;
      taches = propres;
      sauvegarder(); rendre(); fermerDonnees();
      toast(`${nImportees} tâche(s) importée(s)`);
    }catch(e){
      toast('Fichier invalide', 'danger');
    }
  };
  lecteur.readAsText(fichier);
}
