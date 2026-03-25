# Memory-Claw — DIAGNOSIS

**Date**: 2026-03-25
**Diagnostic par**: ZeroClaw (coéquipier Sam)

## 🔴 Cause principale

**Le dossier `dist/` est compilé en v2.4.21 alors que le source est en v2.4.34.**

Le gateway OpenClaw charge le fichier `dist/src/plugin-entry.js`, PAS le source TypeScript. Donc :
- Les fixes d'embeddings (v2.4.34: `encoding_format:'float'`) ne sont jamais appliqués
- Le store LanceDB montre 1 row avec 0D vecteurs au lieu de 1024D
- Toutes les améliorations v2.4.22 → v2.4.34 sont ignorées en production

## 📊 Détails

- `package.json` version: 2.4.34
- `dist/src/db.js` version: 2.4.21
- `dist/src/plugin-entry.js` version: 2.4.21
- Source `src/db.ts`: contient les fixes embeddings récents

## ✅ Solution

1. Recompiler le projet: `npm run build` dans `plugins/memory-claw/`
2. Vérifier que `dist/` est à jour (v2.4.34+)
3. Relancer le gateway OpenClaw
4. Tester: vérifier que les embeddings sont bien 1024D dans la DB

## 🔧 Vérification post-fix

- `node test-integration-simple.js` → vérifier dimension=1024
- Vérifier que `<relevant-memories>` apparaît dans les heartbeats Sam
