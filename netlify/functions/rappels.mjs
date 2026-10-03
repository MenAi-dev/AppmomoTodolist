// Reçoit l'abonnement push + la liste des rappels de l'app (POST /api/rappels)
import { getStore } from '@netlify/blobs';
import webpush from 'web-push';
import { abonnementValide, nettoyerRappels, cleDe, fusionner } from '../lib/logique.mjs';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function configurerPush(){
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, URL: site } = process.env;
  if(!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(site || 'mailto:contact@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return true;
}

export default async (req) => {
  if(req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405);
  let corps;
  try{ corps = await req.json(); }catch(_){ return json({ erreur: 'JSON invalide' }, 400); }
  if(!abonnementValide(corps.subscription)) return json({ erreur: 'Abonnement invalide' }, 400);

  // Test : envoie une notification après quelques secondes (le temps de verrouiller le téléphone)
  if(corps.action === 'test'){
    if(!configurerPush()) return json({ erreur: 'Clés VAPID absentes sur Netlify' }, 500);
    await new Promise(r => setTimeout(r, 5000));
    try{
      await webpush.sendNotification(corps.subscription,
        JSON.stringify({ titre: 'Test des notifications', corps: 'Ça fonctionne 🎉', tag: 'test' }), { TTL: 60, urgency: 'high' });
      return json({ ok: true });
    }catch(e){
      return json({ erreur: 'Envoi refusé', code: e.statusCode || 0 }, 502);
    }
  }

  const store = getStore({ name: 'rappels', consistency: 'strong' });
  const cle = cleDe(corps.subscription.endpoint);
  const items = nettoyerRappels(corps.items);
  const ancien = await store.get(cle, { type: 'json' });
  await store.setJSON(cle, fusionner(ancien, { endpoint: corps.subscription.endpoint, keys: corps.subscription.keys }, items));
  return json({ ok: true, n: items.length });
};

export const config = { path: '/api/rappels' };
