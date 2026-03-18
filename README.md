# Memory French v2.1.0

**Plugin 100% autonome pour la capture et le rappel de mémoires en français via LanceDB + Mistral Embeddings.**

Memory French est un plugin OpenClaw autonome qui gère sa propre base de données, sa propre configuration et ses propres tools. Il capture automatiquement les faits, préférences et décisions importants de vos conversations et les rend disponibles via des recherches sémantiques avancées.

## 🎯 Vue d'ensemble

Memory French existe pour résoudre un problème fondamental : **les IA oublient tout entre les conversations**. Chaque nouvelle session commence from scratch, sans contexte ni mémoire des échanges précédents.

Ce plugin :
- **Capture automatiquement** les informations importantes depuis vos conversations
- **Stocke les mémoires** dans une base de données vectorielle locale (LanceDB)
- **Rappelle le contexte pertinent** au début de chaque conversation
- **Survit aux mises à jour d'OpenClaw** (100% autonome)

### Pourquoi Memory French ?

Contrairement au plugin `memory-lancedb` intégré à OpenClaw, Memory French est :
- **Autonome** : Gère sa propre DB, config et tools
- **Persistant** : Survit aux mises à jour d'OpenClaw
- **Intelligent** : Importance dynamique, rappel pondéré, détection d'injection
- **Franco-centré** : Patterns optimisés pour contexte tech/web/SEO français
- **Complet** : Export/import, GC, statistiques, CLI

---

## ✨ Fonctionnalités v2.1.0

### 🧠 Importance Dynamique

Chaque mémoire se voit attribuer un score d'importance (0-1) calculé dynamiquement selon :

- **Catégorie** : entity (0.9), decision (0.85), preference (0.7), technical (0.65), etc.
- **Source** : manual (0.9), agent_end (0.7), session_end (0.6), auto-capture (0.6)
- **Longueur** : Bonus pour textes concis (20-200 caractères)
- **Mots-clés** : Bonus pour "important", "essentiel", "toujours", "jamais"
- **Densité** : Bonus pour noms propres, dates, nombres
- **Pénalités** : Questions, expressions vagues ("je pense", "peut-être")

### ⚖️ Rappel Pondéré (Weighted Recall)

Le système de rappel combine trois facteurs pour classer les résultats :

- **Similarité sémantique (60%)** : Proximité vectorielle
- **Importance (30%)** : Score d'importance de la mémoire
- **Récence (10%)** : Âge de la mémoire (décroissance sur 90 jours)

Un pénalité de diversité est appliquée aux mémoires fréquemment rappelées pour éviter la redondance.

### 📝 Capture Multi-Messages

Les messages utilisateur consécutifs sont regroupés intelligemment :
- Détection de similarité sémantique entre messages
- Regroupement si > 30% de mots significatifs partagés
- Capture du contexte complet plutôt que de fragments

### 🛡️ Anti-Injection

Protection avancée contre les prompt injections :
- Détection de patterns d'injection (français + anglais)
- Filtrage des commandes système (exec, eval, $_GET)
- Échappement HTML du contenu injecté dans le prompt
- Avertissement de suspicion dans les logs

### 🚦 Rate Limiting

Protection contre la surcharge :
- Limite configurable (défaut : 10 captures/heure)
- Dépassement autorisé pour mémoires haute importance (> 0.8)
- Tracking en temps réel via CLI

### 📊 Statistiques Persistées

- Captures, rappels, erreurs comptabilisés
- Persistance dans `~/.openclaw/memory/memory-french-stats.json`
- Survit aux redémarrages
- Log toutes les 5 minutes si activité

### 🗑️ Garbage Collection Automatique

- Intervalle configurable (défaut : 24h)
- Supprime les mémoires : âge > 30 jours + importance < 0.5 + hitCount < 3
- GC initial après 1 minute de démarrage

### 💾 Export/Import JSON

- Export complet avec métadonnées
- Import intelligent avec déduplication
- Format versionné pour compatibilité future

### 🔄 Migration Automatique

- Migration automatique depuis `memory-lancedb` (table `memories` → `memories_fr`)
- Détection et préservation des mémoires existants
- Déduplication lors de la migration

---

## 📦 Installation

### 1. Cloner le plugin

```bash
cd ~/.openclaw/workspace/plugins
git clone https://github.com/duan78/memory-french.git
cd memory-french
npm install
```

### 2. Configurer OpenClaw

Ajouter à votre fichier `openclaw.json` :

```json
{
  "plugins": {
    "entries": {
      "memory-french": {
        "config": {
          "enabled": true,
          "embedding": {
            "apiKey": "votre-clé-mistral-ici",
            "model": "mistral-embed",
            "baseUrl": "https://api.mistral.ai/v1",
            "dimensions": 1024
          },
          "dbPath": "~/.openclaw/memory/memory-french",
          "maxCapturePerTurn": 5,
          "captureMinChars": 20,
          "captureMaxChars": 3000,
          "recallLimit": 5,
          "recallMinScore": 0.3,
          "enableStats": true,
          "gcInterval": 86400000,
          "gcMaxAge": 2592000000,
          "rateLimitMaxPerHour": 10,
          "enableWeightedRecall": true,
          "enableDynamicImportance": true
        }
      }
    }
  }
}
```

### 3. Redémarrer OpenClaw

```bash
# Si OpenClaw est en cours d'exécution
openclaw stop
openclaw start
```

---

## ⚙️ Configuration

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `enabled` | boolean | `true` | Active ou désactive le plugin |
| `embedding.apiKey` | string | **requis** | Clé API Mistral (ou via `MISTRAL_API_KEY`) |
| `embedding.model` | string | `"mistral-embed"` | Modèle d'embeddings |
| `embedding.baseUrl` | string | `"https://api.mistral.ai/v1"` | URL base API |
| `embedding.dimensions` | number | `1024` | Dimension des vecteurs |
| `dbPath` | string | `"~/.openclaw/memory/memory-french"` | Chemin base LanceDB |
| `maxCapturePerTurn` | number | `5` | Max captures par tour |
| `captureMinChars` | number | `20` | Longueur min pour capture |
| `captureMaxChars` | number | `3000` | Longueur max pour capture |
| `recallLimit` | number | `5` | Max mémoires rappelées |
| `recallMinScore` | number | `0.3` | Score min similarité (0-1) |
| `enableStats` | boolean | `true` | Active statistiques/logs |
| `gcInterval` | number | `86400000` | Intervalle GC en ms (24h) |
| `gcMaxAge` | number | `2592000000` | Âge max mémoires en ms (30j) |
| `rateLimitMaxPerHour` | number | `10` | Max captures par heure |
| `enableWeightedRecall` | boolean | `true` | Active rappel pondéré |
| `enableDynamicImportance` | boolean | `true` | Active importance dynamique |

---

## 🔧 Tools

Le plugin enregistre 6 tools utilisables par l'agent :

### `memory_store`
Stocke manuellement un mémo en mémoire.

**Paramètres :**
- `text` (string, requis) : Texte à stocker
- `importance` (number, optionnel) : Score 0-1 (défaut : auto-calculé)
- `category` (string, optionnel) : Catégorie (preference, decision, entity, seo, technical, workflow, debug, fact)

**Exemple :**
```
Utilisateur : Note que je préfère travailler avec TypeScript plutôt que JavaScript
→ L'agent appelle memory_store avec le texte
→ Résultat : "Stored: 'je préfère travailler avec TypeScript...' (id: xxx, category: preference, importance: 0.75)"
```

### `memory_recall`
Recherche des mémoires par similarité sémantique avec scoring pondéré.

**Paramètres :**
- `query` (string, requis) : Recherche
- `limit` (number, optionnel) : Max résultats (défaut : 5)

**Exemple :**
```
Utilisateur : Quelles sont mes préférences techniques ?
→ L'agent appelle memory_recall avec "préférences techniques"
→ Résultat : "Found 3 memories: 1. [preference] je préfère TypeScript... (score: 85%, importance: 75%)"
```

### `memory_forget`
Supprime un mémo par ID ou par requête.

**Paramètres :**
- `memoryId` (string, optionnel) : ID spécifique à supprimer
- `query` (string, optionnel) : Recherche pour trouver les mémoires à supprimer

**Exemple :**
```
Utilisateur : Oublie tout ce que je t'ai dit sur mon ancien projet
→ L'agent appelle memory_forget avec query="ancien projet"
→ Résultat : "Deleted 3 memories matching query."
```

### `memory_export`
Exporte toutes les mémoires vers un fichier JSON.

**Paramètres :**
- `filePath` (string, optionnel) : Chemin personnalisé (défaut : auto-généré)

**Exemple :**
```
→ Export vers ~/.openclaw/memory/memory-french-backup-1234567890.json
```

### `memory_import`
Importe des mémoires depuis un fichier JSON.

**Paramètres :**
- `filePath` (string, requis) : Chemin du fichier JSON

**Exemple :**
```
→ Importe depuis le fichier, déduplique, et compte les importés/skippés
```

### `memory_gc`
Exécute le garbage collection manuellement.

**Paramètres :**
- `maxAge` (number, optionnel) : Âge max en ms (défaut : 30 jours)
- `minImportance` (number, optionnel) : Importance min (défaut : 0.5)
- `minHitCount` (number, optionnel) : Hit count min (défaut : 3)

**Exemple :**
```
→ Supprime les vieilles mémoires peu importantes et peu utilisées
```

---

## 💻 CLI Commands

Le plugin enregistre 6 commandes CLI :

### `openclaw memory-fr list`
Liste les mémoires stockées avec filtres optionnels.

**Options :**
- `--category` : Filtrer par catégorie
- `--limit` : Max résultats (défaut : 20)
- `--json` : Output JSON

**Exemple :**
```bash
openclaw memory-fr list --category preference --limit 10
openclaw memory-fr list --json
```

### `openclaw memory-fr search <query>`
Recherche des mémoires par similarité sémantique.

**Options :**
- `--limit` : Max résultats (défaut : 10)

**Exemple :**
```bash
openclaw memory-fr search "TypeScript preferences"
openclaw memory-fr search "SEO strategy" --limit 5
```

### `openclaw memory-fr stats`
Affiche les statistiques d'utilisation.

**Exemple :**
```bash
$ openclaw memory-fr stats
Memory Statistics:
------------------
Total memories: 42
Captures: 15
Recalls: 28
Errors: 0
Uptime: 45 minutes
Rate limit: 3/hour (max: 10)
```

### `openclaw memory-fr export [path]`
Exporte les mémoires vers un fichier JSON.

**Options :**
- `--path` : Chemin personnalisé (défaut : auto-généré)

**Exemple :**
```bash
openclaw memory-fr export
openclaw memory-fr export --path ~/backup/memories.json
```

### `openclaw memory-fr gc`
Exécute le garbage collection.

**Options :**
- `--maxAge` : Âge max en jours (défaut : 30)
- `--minImportance` : Importance min (défaut : 0.5)
- `--minHitCount` : Hit count min (défaut : 3)

**Exemple :**
```bash
openclaw memory-fr gc
openclaw memory-fr gc --maxAge 60 --minImportance 0.3
```

### `openclaw memory-fr clear`
Supprime toutes les mémoires (requiert confirmation).

**Options :**
- `--confirm=true` : Confirmer la suppression

**Exemple :**
```bash
openclaw memory-fr clear --confirm=true
⚠️  This action cannot be undone!
Cleared 42 memories from the database.
```

---

## 🪝 Hooks

Le plugin utilise 3 hooks OpenClaw :

### `before_agent_start`
Injecte le contexte pertinent avant le début de l'agent.

- Cherche des mémoires similaires au prompt utilisateur
- Injecte les résultats dans `<relevant-memories>` avec avertissement sécurité
- Incrémente les hitCount des mémoires rappelées
- Log le nombre de mémoires injectées

### `agent_end`
Capture automatique des faits depuis les messages utilisateur.

- Ne s'exécute que si l'agent a réussi (`success: true`)
- Groupe les messages utilisateur consécutifs
- Applique les filtres (triggers, injection, rate limit)
- Calcule l'importance dynamique
- Déduplique avant stockage
- Log le nombre de captures

### `session_end`
Capture de récupération en cas de crash/kill.

- Lit le fichier de session JSON
- Extrait les messages de la conversation
- Applique le même processus que `agent_end`
- Permet de récupérer les mémoires même si OpenClaw crash

---

## 🗄️ Schéma de Base de Données

La base LanceDB utilise le schéma étendu suivant :

```typescript
{
  id: string;           // UUID unique
  text: string;         // Texte de la mémoire
  vector: number[];     // Embedding Mistral (1024 dim)
  importance: number;   // Score 0-1 (calculé dynamiquement)
  category: string;     // Catégorie (preference, decision, etc.)
  createdAt: number;    // Timestamp création
  updatedAt: number;    // Timestamp dernière mise à jour
  source: string;       // Source (manual, agent_end, session_end, auto-capture)
  hitCount: number;     // Nombre de fois rappelée
}
```

**Table :** `memories_fr` (anciennement `memories`)

**Dimensions vecteur :** 1024 (Mistral Embed)

---

## 🏷️ Catégories et Importances

| Catégorie | Importance | Description | Exemple |
|-----------|------------|-------------|---------|
| `entity` | 0.9 | Personnes, contacts, entreprises | "Jean Dupont est mon client" |
| `decision` | 0.85 | Décisions prises | "On a décidé d'utiliser PostgreSQL" |
| `preference` | 0.7 | Préférences, choix | "Je préfère TypeScript" |
| `technical` | 0.65 | Config technique, infra | "Le serveur est sur nginx" |
| `seo` | 0.6 | SEO, marketing, contenu | "Mots-clés : "voyage italie"" |
| `workflow` | 0.6 | Processus, méthodes | "Toujours tester avant déployer" |
| `debug` | 0.4 | Erreurs, bugs | "Erreur 404 sur /api/users" |
| `fact` | 0.5 | Faits généraux | "Paris est la capitale de France" |

---

## 🧬 Garbage Collection

Le GC automatique supprime les mémoires selon 3 critères :

1. **Âge** : Plus de 30 jours (configurable)
2. **Importance** : Inférieure à 0.5
3. **HitCount** : Moins de 3 rappels

**Fréquence :** Toutes les 24h (configurable)

**GC initial :** 1 minute après démarrage

Le GC préserve les mémoires importantes ou fréquemment utilisées.

---

## 📥 Export/Import

### Format Export JSON

```json
{
  "version": "2.0.0",
  "exportedAt": 1234567890000,
  "count": 42,
  "memories": [
    {
      "id": "uuid",
      "text": "Texte de la mémoire",
      "importance": 0.75,
      "category": "preference",
      "createdAt": 1234567890000,
      "updatedAt": 1234567890000,
      "source": "manual",
      "hitCount": 5
    }
  ]
}
```

### Import Intelligent

- Déduplication par similarité de texte (> 85% = skip)
- Régénération des embeddings à l'import
- Préservation des métadonnées originales
- Rapport d'import (importés/skippés)

---

## 🔄 Migration depuis memory-lancedb

La migration est **automatique** au premier démarrage :

1. Détection de l'ancienne table `memories`
2. Lecture des entrées existantes
3. Déduplication avec nouvelles mémoires
4. Stockage dans nouvelle table `memories_fr`
5. Log du nombre de mémoires migrées

**Note :** L'ancienne table n'est pas supprimée (sécurité)

---

## 📈 Statistiques

Les statistiques sont persistées dans `~/.openclaw/memory/memory-french-stats.json` :

```json
{
  "captures": 42,
  "recalls": 128,
  "errors": 0,
  "lastReset": 1234567890000
}
```

- Survit aux redémarrages
- Réinitialisable via code
- Log toutes les 5 minutes si activité
- Accessible via CLI `memory-fr stats`

---

## 🔄 Compatibilité MAJ OpenClaw

Memory French est **100% autonome** et **survit aux mises à jour OpenClaw** :

- ✅ Base de données indépendante (`~/.openclaw/memory/memory-french`)
- ✅ Configuration propre dans `openclaw.json`
- ✅ Tools enregistrés dynamiquement
- ✅ Hooks enregistrés via API plugin
- ✅ Pas de dépendance au code interne d'OpenClaw

**Contrairement à `memory-lancedb`** qui est intégré au core et peut être modifié/réinitialisé lors des mises à jour.

---

## 📂 Structure du Code

```
memory-french/
├── index.ts                 # Plugin principal (1876 lignes)
├── package.json             # Dépendances npm
├── openclaw.plugin.json     # Metadata plugin
├── README.md                # Documentation (ce fichier)
└── test.ts                  # Tests unitaires
```

**Sections principales dans `index.ts` :**
1. Types & Config
2. Category/Source Importance Weights
3. Prompt Injection Patterns
4. French Triggers (patterns enrichis)
5. Dynamic Importance Calculation
6. Rate Limiting Tracker
7. Multi-Message Context Grouping
8. Text Processing Utilities
9. LanceDB Wrapper
10. Embeddings Client
11. Statistics Tracker
12. Export/Import Functions
13. Migration Function
14. Plugin Definition (register)

---

## 🌍 Section Multilingue (Préparation v2.2.0)

La v2.2.0 introduira le support multilingue avec le renommage en **MemoryClaw** :

### Plan v2.2.0

- **Architecture multilingue** : Dossier `locales/` avec patterns par langue
- **Locales supportées** : Français (principal), Anglais, Espagnol, Allemand
- **Détection automatique** : Heuristiques pour détecter la langue des messages
- **Mapping multilingue** : Catégories communes, patterns spécifiques par langue
- **Renommage plugin** : `memory-french` → `memory-claw`
- **Config locales** : Paramètre `locales: string[]` pour sélectionner les langues actives

### Fonctionnement prévu

```typescript
// Détection langue
const lang = detectLanguage("Je préfère TypeScript"); // "fr"
const lang = detectLanguage("I prefer TypeScript");   // "en"

// Chargement patterns
const patterns = loadLocales(["fr", "en"]);

// Catégorisation multilingue
const category = detectCategory("Je préfère...", "fr"); // "preference"
const category = detectCategory("I prefer...", "en");   // "preference"
```

---

## 🚀 Version

**Version actuelle :** 2.1.0

**Auteur :** duan78

**Repository :** https://github.com/duan78/memory-french

---

## 📝 Changelog

### v2.1.0 (2025)
- ✨ Importance dynamique basée sur catégorie, longueur, contenu
- ⚖️ Rappel pondéré (similarité + importance + récence)
- 📝 Capture multi-messages avec regroupement intelligent
- 🛡️ Hardening anti-injection (patterns avancés)
- 🚦 Rate limiting configurable
- 💻 6 CLI commands (list, search, stats, export, gc, clear)
- 📊 Statistiques persistées
- 🗑️ GC automatique configurable
- 💾 Export/Import JSON versionné

### v2.0.0
- 🎉 Plugin 100% autonome (DB, config, tools indépendants)
- 🗄️ Schéma DB étendu (importance, category, source, hitCount)
- 🪝 3 Hooks (before_agent_start, agent_end, session_end)
- 🔄 Migration automatique depuis memory-lancedb
- 📈 Statistiques persistées
- 🗑️ Garbage collection
- 💾 Export/Import JSON

---

## 🤝 Contribution

Contributions welcome ! N'hésitez pas à ouvrir des issues ou des PRs.

---

## 📄 Licence

ISC

---

**Memory French v2.1.0 — Your memory, enhanced.** 🧠✨
