# Mes tâches — version avec notifications push

Structure
- public/            l'app (index.html, css, js, icônes, sw.js, manifest.json)
- netlify/functions/ rappels.mjs (reçoit les rappels) + envoyer-rappels.mjs (envoie chaque minute)
- netlify/lib/       logique commune
- netlify.toml       dit à Netlify de publier "public" et de lire les fonctions

Mise en ligne
1. Remplace le contenu de ton dépôt GitHub par ces fichiers (garde ce dossier tel quel, node_modules n'est pas à envoyer).
2. Netlify > ton site > Site configuration > Build & deploy : le dépôt doit être connecté (déploiement continu).
3. Netlify > Site configuration > Environment variables, ajoute :
   VAPID_PUBLIC_KEY  = (clé publique)
   VAPID_PRIVATE_KEY = (clé privée, à ne JAMAIS mettre dans GitHub)
4. Redéploie (Deploys > Trigger deploy).
5. Sur l'iPhone : ouvre l'app depuis l'icône de l'écran d'accueil > Sauvegarde > Activer les notifications > Envoyer un test.
