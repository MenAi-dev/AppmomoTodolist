// Tourne chaque minute : envoie les notifications des rappels arrivés à échéance
import { getStore } from '@netlify/blobs';
import webpush from 'web-push';
import { dues, texteCorps } from '../lib/logique.mjs';

export default async () => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, URL: site } = process.env;
  if(!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY){ console.error('Clés VAPID absentes'); return; }
  webpush.setVapidDetails(site || 'mailto:contact@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const store = getStore({ name: 'rappels', consistency: 'strong' });
  const { blobs } = await store.list();
  const now = Date.now();

  await Promise.all(blobs.map(async ({ key }) => {
    const rec = await store.get(key, { type: 'json' });
    if(!rec || !rec.subscription) return;
    const envoyes = {};
    for(const i of dues(rec, now)){
      try{
        await webpush.sendNotification(rec.subscription,
          JSON.stringify({ titre: i.titre, corps: texteCorps(i, now), tag: 'rappel-' + i.id, id: i.id }),
          { TTL: 600, urgency: 'high' });
        envoyes[i.id] = i.alerte;
      }catch(e){
        if(e.statusCode === 404 || e.statusCode === 410){ await store.delete(key); return; } // abonnement disparu
        console.error('Envoi échoué', e.statusCode, e.body);
      }
    }
    if(!Object.keys(envoyes).length) return;
    // on relit l'enregistrement : le client a pu le mettre à jour pendant l'envoi
    const frais = (await store.get(key, { type: 'json' })) || rec;
    frais.envoyes = { ...(frais.envoyes || {}), ...envoyes };
    await store.setJSON(key, frais);
  }));
};

export const config = { schedule: '* * * * *' };
