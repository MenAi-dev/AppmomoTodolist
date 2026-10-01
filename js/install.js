// --- Installation de la PWA + diagnostic ---
let promptInstall = null;
const estInstallee = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const UA = navigator.userAgent;
const SUR_IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const NAV_INTEGRE = /FBAN|FBAV|Instagram|WhatsApp|Line\/|MicroMessenger|TikTok|Snapchat|; wv\)/i.test(UA);

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); promptInstall = e; majBoutonInstall(); });
window.addEventListener('appinstalled', () => { promptInstall = null; fermerInstall(); majBoutonInstall(); toast('Application installée'); });

function majBoutonInstall(){ $('btnInstaller').hidden = estInstallee(); }

async function ouvrirInstall(){
  const reg = ('serviceWorker' in navigator) ? await navigator.serviceWorker.getRegistration().catch(()=>null) : null;
  const ligne = (nom, ok, aide) => `<div class="stat-ligne"><span>${nom}</span><b class="${ok?'ok':'ko'}">${ok?'✓ OK':'✗ '+aide}</b></div>`;
  $('installDiag').innerHTML =
    ligne('Lien sécurisé (https)', window.isSecureContext, 'ouvre via un lien https://') +
    ligne('Mode hors ligne', !!(reg && reg.active), reg ? 'en cours…' : 'non actif') +
    ligne('Navigateur compatible', !NAV_INTEGRE, 'navigateur intégré');

  let aide;
  if(estInstallee()) aide = "L'application est déjà installée sur cet appareil.";
  else if(NAV_INTEGRE) aide = "Tu es dans le navigateur intégré d'une autre application (WhatsApp, Facebook…). Ouvre ce lien dans Chrome (Android) ou Safari (iPhone), puis réessaie.";
  else if(!window.isSecureContext) aide = "L'installation exige un lien en https://. Mets le dossier en ligne (Netlify, GitHub Pages…) et ouvre le lien obtenu, pas le fichier index.html.";
  else if(promptInstall) aide = "Appuie sur « Installer maintenant ».";
  else if(SUR_IOS) aide = "Sur iPhone, dans Safari : appuie sur le bouton Partager (carré avec une flèche), puis « Sur l'écran d'accueil ».";
  else aide = "Dans le menu du navigateur (⋮), choisis « Installer l'application » ou « Ajouter à l'écran d'accueil ». Si l'option manque, recharge la page une fois en ligne et réessaie.";
  $('installAide').textContent = aide;
  $('btnInstallerNatif').hidden = !promptInstall;
  $('overlayInstall').classList.add('actif');
}
function fermerInstall(){ $('overlayInstall').classList.remove('actif'); }

$('btnInstaller').addEventListener('click', ouvrirInstall);
$('installFermer').addEventListener('click', fermerInstall);
$('overlayInstall').addEventListener('click', e => { if(e.target === $('overlayInstall')) fermerInstall(); });
$('btnInstallerNatif').addEventListener('click', async () => {
  if(!promptInstall) return;
  promptInstall.prompt();
  await promptInstall.userChoice.catch(()=>{});
  promptInstall = null; fermerInstall(); majBoutonInstall();
});
majBoutonInstall();
