# memory-french

Plugin OpenClaw **100% autonome** pour la capture et le rappel automatique de mémos en français via LanceDB + Mistral Embeddings.

## 🎯 Pourquoi ?

- Le plugin officiel `memory-lancedb` a un auto-capture basé sur des patterns en anglais/tchèque qui ne matchent pas le français
- Les MAJ d'OpenClaw peuvent écraser les extensions et casser la config
- On voulait un plugin **indépendant**, avec **sa propre DB**, **sa propre config**, et des **tools autonomes**

## ✨ Fonctionnalités v2.0

- **100% autonome** — propre DB, propre config, propre tools. Zéro dépendance à memory-lancedb
- **6 tools** : store, recall, forget, export, import, garbage collection
- **3 hooks** : agent_end, session_end (crash recovery), before_agent_start (recall)
- **Patterns français intelligents** : préférences, décisions, faits, entités, tech, SEO
- **Catégorisation avancée** : preference, decision, entity, seo, technical, workflow, debug, fact
- **Déduplication hybride** : vectorielle + similarité texte (seuil 85%)
- **Hit tracking** : chaque recall match incrémente un compteur → les mémos utiles ne sont jamais purgés
- **GC automatique** : purge les mémos > 30j avec importance < 0.5 et hitCount < 3
- **Export/Import JSON** : backup/restore complet
- **Migration automatique** : importe les mémos de la table memory-lancedb au premier démarrage
- **Stats persistées** : sauvegardées dans `~/.openclaw/memory/memory-french-stats.json`
- **Détection dynamique des dimensions** : adapte la taille des vecteurs au premier embedding

## 📦 Installation

### 1. Cloner

```bash
git clone https://github.com/duan78/memory-french.git ~/.openclaw/workspace/plugins/memory-french
cd ~/.openclaw/workspace/plugins/memory-french
npm install
```

### 2. Configurer OpenClaw

Ajouter dans `openclaw.json` :

```json
{
  "plugins": {
    "load": {
      "paths": [
        "/root/.openclaw/workspace/plugins/memory-french"
      ]
    },
    "allow": ["memory-french"],
    "entries": {
      "memory-french": {
        "config": {
          "embedding": {
            "apiKey": "VOTRE_CLE_MISTRAL",
            "model": "mistral-embed",
            "baseUrl": "https://api.mistral.ai/v1",
            "dimensions": 256
          },
          "enabled": true,
          "maxCapturePerTurn": 5,
          "recallLimit": 5,
          "enableStats": true,
          "gcInterval": 86400000,
          "gcMaxAge": 2592000000
        }
      }
    }
  }
}
```

### 3. Redémarrer

```bash
openclaw gateway restart
```

## ⚙️ Configuration

### Paramètres

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `enabled` | `true` | Active/désactive le plugin |
| `embedding.apiKey` | requis | Clé API Mistral |
| `embedding.model` | `mistral-embed` | Modèle d'embeddings |
| `embedding.baseUrl` | `https://api.mistral.ai/v1` | URL de l'API |
| `embedding.dimensions` | `1024` | Dimensions des vecteurs (auto-détecté) |
| `dbPath` | `~/.openclaw/memory/memory-french` | Chemin de la DB |
| `maxCapturePerTurn` | `5` | Max mémos capturés par tour |
| `captureMinChars` | `20` | Longueur min pour capture |
| `captureMaxChars` | `3000` | Longueur max pour capture |
| `recallLimit` | `5` | Max mémos rappelés |
| `recallMinScore` | `0.3` | Score min de similarité |
| `enableStats` | `true` | Active les statistiques |
| `gcInterval` | `86400000` (24h) | Intervalle GC automatique |
| `gcMaxAge` | `2592000000` (30j) | Âge max avant purge GC |

## 🧠 Tools

### `memory_store`
Stocke un mémo manuellement.
```
memory_store({ text: "Arnaud préfère Rust pour les crawlers", importance: 0.9 })
```

### `memory_recall`
Recherche des mémos par similarité sémantique.
```
memory_recall({ query: "langage préféré", limit: 5 })
```

### `memory_forget`
Supprime un mémo par ID ou par query.
```
memory_forget({ memoryId: "uuid..." })
memory_forget({ query: "vieux mot de passe" })
```

### `memory_export`
Exporte tous les mémos en JSON.
```
memory_export({ filePath: "/chemin/backup.json" })
```

### `memory_import`
Importe des mémos depuis un JSON.
```
memory_import({ filePath: "/chemin/backup.json" })
```

### `memory_gc`
Lance le garbage collection manuellement.
```
memory_gc({ maxAge: 2592000000, minImportance: 0.5, minHitCount: 3 })
```

## 🔄 Hooks

### `before_agent_start` — Auto-recall
Avant chaque conversation, injecte les mémos pertinents dans le contexte.

### `agent_end` — Auto-capture
Capture les faits des messages utilisateur quand la conversation se termine normalement.

### `session_end` — Crash recovery
Capture les mémos même si l'agent crash ou est killed. Lit le fichier transcript de la session.

## 🗄️ Schéma étendu

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | UUID unique |
| `text` | string | Contenu du mémo |
| `vector` | float[] | Vecteur d'embedding |
| `importance` | float | Score 0.0 - 1.0 |
| `category` | string | preference/decision/entity/seo/technical/workflow/debug/fact |
| `createdAt` | number | Timestamp de création |
| `updatedAt` | number | Timestamp de dernière mise à jour |
| `source` | string | auto-capture/agent_end/session_end/manual |
| `hitCount` | number | Nombre de fois rappelé |

## 🧹 Garbage Collection

Le GC tourne automatiquement (défaut: toutes les 24h) et supprime les mémos qui :
- Sont plus vieux que 30 jours
- Ont une importance < 0.5
- Ont été rappelés moins de 3 fois (hitCount < 3)

Les mémos utiles (hitCount élevé) ne sont jamais purgés.

## 📦 Export/Import

```bash
# Export automatique (via tool)
# → ~/.openclaw/memory/memory-french-backup-{timestamp}.json

# Import
memory_import({ filePath: "~/.openclaw/memory/memory-french-backup-xxx.json" })
```

## 🔄 Migration depuis memory-lancedb

Au premier démarrage, si la table `memories` (memory-lancedb) existe dans la même DB, les mémos sont automatiquement migrés vers `memories_fr`. Le check de doublon par similarité texte évite les répétitions.

## 📊 Statistiques

Persistées dans `~/.openclaw/memory/memory-french-stats.json` :
- Nombre de captures
- Nombre de recalls
- Nombre d'erreurs
- Uptime

Logs toutes les 5 minutes si activé.

## 🛡️ Compatibilité MAJ OpenClaw

Ce plugin est **100% indépendant** :
- Pas dans le dossier d'extensions d'OpenClaw
- Propre DB (`memories_fr`), pas de conflit
- Propre config, pas de dépendance
- Survit à toutes les MAJ

## 📁 Structure

```
memory-french/
├── index.ts              # Code principal
├── openclaw.plugin.json  # Manifest + configSchema
├── package.json          # Dépendances
├── README.md             # Ce fichier
└── ROADMAP.md            # Feuille de route
```

## 📝 Dépendances

- `openai` — SDK OpenAI-compatible (pour l'API Mistral)
- `@lancedb/lancedb` — Base de données vectorielle
- `@sinclair/typebox` — Types pour les tools

## 📄 Licence

ISC

## 👨‍💻 Auteur

**duan78** — Assistant IA d'Arnaud (expert web/SEO, France)

---

*Version 2.0.0 - 2026-03-18*
