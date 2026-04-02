# Checklist Validation Service Worker — Whistle PWA

**Creee :** 2026-03-29 (retro Epic 3, preparation Epic 4)
**Owner :** Dana (QA)
**Objectif :** Protocole de validation manuelle du Service Worker sur device reel

---

## Prerequis

- Chrome Android (version recente)
- Device Android reel (pas emulateur pour les tests finaux)
- Build production : `npm run build && npm run preview`
- DevTools > Application > Service Workers visible

---

## 1. Installation initiale

- [ ] Ouvrir l'app en navigation privee (pas de SW precedent)
- [ ] Verifier dans DevTools que le SW s'installe (status: activated)
- [ ] Verifier que les assets sont precaches (Cache Storage > workbox-precache)
- [ ] Verifier que les fichiers JSON sont dans le runtime cache (Cache Storage > workbox-runtime ou equivalent)
- [ ] Mesurer le temps de chargement initial (objectif : < 2s sur 4G)

## 2. Cache-first (assets statiques)

- [ ] Charger l'app une premiere fois (assets caches)
- [ ] Couper le reseau (DevTools > Network > Offline)
- [ ] Recharger la page
- [ ] Verifier que JS, CSS, fonts, images se chargent depuis le cache
- [ ] Verifier que l'UI s'affiche correctement (pas de FOUC, pas de font fallback)

## 3. Network-first (donnees JSON)

- [ ] Avec reseau : verifier que les JSON sont fetches depuis le reseau (DevTools > Network)
- [ ] Sans reseau : verifier que les JSON sont servis depuis le cache
- [ ] Modifier le JSON sur le serveur, recharger avec reseau : verifier que les nouvelles donnees apparaissent
- [ ] Verifier que le cache est mis a jour avec les nouvelles donnees

## 4. Mode offline complet

- [ ] Activer mode avion sur le device Android
- [ ] Ouvrir l'app depuis l'ecran d'accueil (si installee) ou depuis Chrome
- [ ] Verifier : classement affiche, score card, achievements, bottom sheet fonctionnel
- [ ] Verifier : bouton "Reveler la projection" fonctionne (animation)
- [ ] Verifier : aucun message d'erreur technique visible
- [ ] Verifier : si aucun cache existe, afficher "Les donnees arrivent lundi" (story 3-5)

## 5. Mise a jour silencieuse

- [ ] App ouverte avec SW v1 actif
- [ ] Deployer une nouvelle version (SW v2) sur le serveur
- [ ] Recharger la page ou attendre le check automatique
- [ ] Verifier que le nouveau SW s'installe en background (DevTools > SW > waiting)
- [ ] Verifier que `registerType: 'autoUpdate'` active le nouveau SW automatiquement
- [ ] Verifier que les nouvelles donnees JSON declenchent l'event `data-refreshed` dans le store
- [ ] Verifier que le badge "Nouveau" apparait silencieusement (si applicable)

## 6. Installation PWA (Add to Home Screen)

- [ ] Ouvrir l'app dans Chrome Android
- [ ] Verifier que le prompt "Ajouter a l'ecran d'accueil" est disponible (ou menu > Installer)
- [ ] Installer l'app
- [ ] Ouvrir depuis l'ecran d'accueil : verifier standalone (pas de barre d'adresse)
- [ ] Verifier le splash screen (logo Whistle sur fond violet)
- [ ] Verifier la barre de statut coloree (theme-color violet)
- [ ] Verifier l'orientation portrait

## 7. Re-installation et nettoyage

- [ ] Desinstaller l'app (parametres Android > Apps)
- [ ] Revisiter le site dans Chrome
- [ ] Verifier que le SW se reinstalle proprement
- [ ] Verifier que les caches sont recrees

## 8. Budget performance

- [ ] Mesurer taille totale du build (`dist/`) : objectif < 200Ko gzippe
- [ ] Mesurer temps de chargement initial sur 4G : objectif < 2s
- [ ] Mesurer temps de demarrage depuis cache : objectif < 1s
- [ ] Verifier que le precaching ne depasse pas le budget

---

## Notes

- Executer cette checklist a chaque story de l'Epic 4 (4-1, 4-2, 4-3)
- Les points 1-5 sont pertinents des la story 4-1
- Les points 6-7 sont pertinents a partir de la story 4-2
- Le point 8 est pertinent tout au long de l'epic
- Documenter les resultats dans les dev notes de chaque story
