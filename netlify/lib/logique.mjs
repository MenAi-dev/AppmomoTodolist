// Logique pure des rappels (sans accès réseau) : facile à tester.
import { createHash } from 'node:crypto';

const HOTES_PUSH = [
  'web.push.apple.com', 'fcm.googleapis.com', 'push.services.mozilla.com', 'notify.windows.com'
];
export const MAX_RAPPELS = 200;
export const FENETRE_MS = 10 * 60000; // un rappel n'est plus envoyé 10 min après son heure

export function abonnementValide(s){
  try{
    if(!s || typeof s.endpoint !== 'string' || s.endpoint.length > 600) return false;
    const u = new URL(s.endpoint);
    if(u.protocol !== 'https:') return false;
    if(!HOTES_PUSH.some(h => u.hostname === h || u.hostname.endsWith('.' + h))) return false;
    const k = s.keys;
    return !!k && typeof k.p256dh === 'string' && typeof k.auth === 'string' && k.p256dh.length < 200 && k.auth.length < 100;
  }catch(_){ return false; }
}

export function nettoyerRappels(items){
  if(!Array.isArray(items)) return [];
  return items.map(i => {
    if(!i || typeof i.id !== 'string' || typeof i.titre !== 'string') return null;
    const alerte = Number(i.alerte), moment = Number(i.moment);
    if(!Number.isFinite(alerte) || !Number.isFinite(moment)) return null;
    return {
      id: i.id.slice(0, 40), titre: i.titre.trim().slice(0, 140) || 'Rappel',
      heure: /^\d{2}:\d{2}$/.test(i.heure) ? i.heure : '', alerte, moment
    };
  }).filter(Boolean).slice(0, MAX_RAPPELS);
}

export const cleDe = endpoint => createHash('sha256').update(endpoint).digest('hex');

// Rappels à envoyer maintenant : alerte passée, pas déjà envoyés, pas trop en retard
export function dues(rec, now){
  const env = rec.envoyes || {};
  return (rec.items || []).filter(i => i.alerte <= now && now <= i.moment + FENETRE_MS && env[i.id] !== i.alerte);
}

export function texteCorps(i, now){
  const min = Math.ceil((i.moment - now) / 60000);
  const h = i.heure ? ` · ${i.heure}` : '';
  return min > 0 ? `Dans ${min} min${h}` : `Maintenant${h}`;
}

// Fusionne un nouvel envoi du client avec l'existant : on garde les « déjà envoyés » encore valables
export function fusionner(ancien, abonnement, items){
  const envoyes = {};
  const prec = (ancien && ancien.envoyes) || {};
  items.forEach(i => { if(prec[i.id] === i.alerte) envoyes[i.id] = i.alerte; });
  return { subscription: abonnement, items, envoyes, maj: Date.now() };
}
