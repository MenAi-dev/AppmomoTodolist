const CLE_STOCKAGE = 'todoData';
let taches = []; // { id, titre, fait, important, date, creeLe, faitLe }

function nettoyerTache(t){
  if(!t || typeof t.titre !== 'string' || !t.titre.trim()) return null;
  return {
    id: typeof t.id === 'string' && t.id ? t.id : nouvelId(),
    titre: t.titre.trim().slice(0,140),
    fait: !!t.fait,
    important: !!t.important,
    date: dateValide(t.date) ? t.date : '',
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
      if(!confirm(`Remplacer tes ${taches.length} tâche(s) actuelle(s) par les ${propres.length} de cette sauvegarde ?`)) return;
      taches = propres;
      sauvegarder(); rendre(); fermerDonnees();
      toast(`${propres.length} tâche(s) importée(s)`);
    }catch(e){
      toast('Fichier invalide', 'danger');
    }
  };
  lecteur.readAsText(fichier);
}
