# Auth admin Vercel

L'auth admin protege uniquement les routes d'ecriture. La consultation publique ne depend pas de cette session.

Secrets attendus cote serveur Vercel :

- `ADMIN_PASSWORD` : mot de passe admin partage, 12 caracteres minimum.
- `ADMIN_AUTH_SECRET` : secret HMAC de session, 32 caracteres minimum.

La route `api/admin/login.js` applique un throttling en memoire par IP comme garde-fou local. Sur Vercel, ce stockage est propre a une instance serverless : la protection robuste contre le brute-force doit donc etre completee par une regle Vercel Firewall/WAF ou un rate-limit partage si l'endpoint devient expose publiquement.
