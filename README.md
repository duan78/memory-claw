# memory-french

Plugin OpenClaw pour la capture et le rappel automatique de mémos en français via LanceDB + Mistral Embeddings.

## 🎯 Pourquoi ?

Le plugin officiel `memory-lancedb` a un auto-capture basé sur des patterns regex en anglais/tchèque qui ne matchent pas le français. Ce plugin complète la mémoire avec des patterns adaptés au contexte francophone tech/web/SEO.

## ✨ Fonctionnalités

- **Patterns français intelligents** : préférences, décisions, faits, entités
- **Triggers tech & web** : configuration, serveur, API, déploiement, SEO, CMS, frameworks
- **Catégorisation avancée** : preference, decision, entity, technical, seo, workflow, debug, fact
- **Filtrage anti-bruit robuste** : élimine les injections de contexte, métadonnées système, répétitions
- **Déduplication hybride** : vectorielle + textuelle pour éviter les doublons
- **Compatible Mistral Embeddings** : fonctionne avec `mistral-embed` via l'API OpenAI-compatible
- **Statistiques persistantes** : sauvegardées dans `~/.openclaw/memory/memory-french-stats.json`
- **Tools autonomes** : `memory_store`, `memory_recall`, `memory_forget`
- **Hook session_end** : capture même en cas de crash/kill de l'agent
- **Indépendant d'OpenClaw** : survit aux mises à jour car situé dans le workspace

## 📦 Installation

### 1. Cloner dans le workspace OpenClaw

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
        "...",
        "/root/.openclaw/workspace/plugins/memory-french"
      ]
    },
    "allow": ["...", "memory-french"]
  }
}
```

### 3. Redémarrer le gateway

```bash
openclaw gateway restart
```

## ⚙️ Configuration

Le plugin réutilise la config embedding de `memory-lancedb` (même base LanceDB, même clé API Mistral). Aucune config supplémentaire n'est nécessaire si `memory-lancedb` est déjà configuré.

### Variables d'environnement

- `MISTRAL_API_KEY` : Clé API Mistral (fallback si pas dans la config)

### Configuration optionnelle

Vous pouvez ajouter une section spécifique dans `openclaw.json` :

```json
{
  "plugins": {
    "entries": {
      "memory-french": {
        "config": {
          "enabled": true,
          "maxCapturePerTurn": 5,
          "captureMinChars": 20,
          "captureMaxChars": 3000,
          "recallLimit": 5,
          "recallMinScore": 0.3,
          "enableStats": true
        }
      }
    }
  }
}
```

#### Paramètres

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `enabled` | `true` | Active/désactive le plugin |
| `maxCapturePerTurn` | `5` | Nombre max de mémos capturés par tour |
| `captureMinChars` | `20` | Longueur min texte pour capture |
| `captureMaxChars` | `3000` | Longueur max texte pour capture |
| `recallLimit` | `5` | Nombre max de mémos rappelés |
| `recallMinScore` | `0.3` | Score min de similarité pour rappel |
| `enableStats` | `true` | Active les statistiques et logs |

## 🧠 Comment ça marche ?

### 1. Capture automatique (`agent_end`)

À chaque fin de conversation, le plugin :

1. Extrait les messages utilisateur
2. Filtre le contenu système et bruit
3. Détecte les patterns français pertinents
4. Catégorise chaque mémo
5. Vérifie les doublons (vectoriel + textuel)
6. Génère l'embedding et stocke dans LanceDB

### 2. Capture en cas de crash (`session_end`)

En plus du hook `agent_end`, le plugin utilise `session_end` pour capturer les mémos même lorsque l'agent crash ou est killé :

1. Lit le fichier de transcript de la session
2. Extrait les messages utilisateur
3. Applique le même processus de capture que `agent_end`

Cette double couche de capture garantit qu'aucune information importante n'est perdue, même en cas d'erreur critique.

### 3. Rappel automatique (`before_agent_start`)

Avant chaque nouvelle conversation, le plugin :

1. Génère l'embedding du prompt utilisateur
2. Cherche les mémos similaires dans LanceDB
3. Filtre par score de similarité
4. Injecte le contexte pertinent dans le prompt

### 4. Tools disponibles

Le plugin enregistre 3 tools utilisables directement par l'agent :

#### `memory_store`

Stocke un mémo manuellement dans la mémoire.

```typescript
parameters: {
  text: string;           // Contenu à stocker (5-10000 caractères)
  importance?: number;    // Score 0.0-1.0 (défaut: 0.7)
  category?: string;      // Catégorie (défaut: auto-détectée)
}
```

#### `memory_recall`

Recherche des mémos par similarité sémantique.

```typescript
parameters: {
  query: string;          // Recherche textuelle
  limit?: number;         // Max résultats (défaut: 5, max: 50)
}
```

#### `memory_forget`

Supprime un mémo par ID ou par requête.

```typescript
parameters: {
  memoryId?: string;      // ID spécifique à supprimer
  query?: string;         // Supprime tous les mémos matchant
}
```

Ces tools permettent une interaction explicite avec la mémoire, par exemple :
- "Store this important decision in memory"
- "Search for what I said about my SEO preferences"
- "Forget all memories about the old server config"

### 5. Catégories

Les catégories suivantes sont utilisées (spécifiques au contexte tech/web/SEO français) :

- **preference** : Préférences, choix, goûts
- **decision** : Décisions prises, accords
- **entity** : Personnes, contacts, entreprises
- **technical** : Config, serveur, infrastructure
- **seo** : SEO, ranking, mots-clés
- **workflow** : Projets, tâches, processus
- **debug** : Bugs, erreurs, problèmes
- **fact** : Autres faits importants

## 🔧 Compatibilité

### Compatibilité memory-lancedb

**⚠️ Double injection potentielle** : Si `memory-lancedb` a `autoRecall: true` (défaut), les deux plugins injecteront du contexte dans vos conversations. Le plugin détecte cette configuration et affiche un warning au démarrage.

**Recommandation** : Si vous utilisez memory-french comme plugin principal pour le français, désactivez l'auto-recall de memory-lancedb :

```json
{
  "plugins": {
    "entries": {
      "memory-lancedb": {
        "config": {
          "autoRecall": false
        }
      }
    }
  }
}
```

**Conflit de schéma** : Les catégories `seo`, `technical`, `workflow`, `debug` ne font pas partie du type `MemoryCategory` standard de memory-lancedb. C'est intentionnel — ces catégories sont optimisées pour le contexte tech/web/SEO francophone. Elles sont stockées comme des chaînes simples dans LanceDB et fonctionnent correctement pour le rappel.

### Compatibilité OpenClaw

- OpenClaw : ✅ Compatible avec toutes les versions
- LanceDB : ✅ Partage la même base que `memory-lancedb`
- Mistral : ✅ `mistral-embed` (1024 dimensions)
- Autres providers : ✅ OpenAI-compatible via config

## 📊 Statistiques

Les statistiques sont persistantes et sauvegardées dans `~/.openclaw/memory/memory-french-stats.json` :

```json
{
  "captures": 15,
  "recalls": 42,
  "errors": 0,
  "lastReset": 1710758400000
}
```

Le plugin log automatiquement toutes les 5 minutes :

```
memory-french: Stats - Captures: 15, Recalls: 42, Errors: 0, Uptime: 300s
```

Les stats sont chargées au démarrage et sauvegardées après chaque opération (capture, recall, error), ce qui permet de les conserver entre les redémarrages du gateway.

## 🛡️ Sécurité

- Les mémos injectés sont marqués comme "untrusted"
- OpenClaw ne suit pas les instructions trouvées dans les mémos
- Les injections système sont filtrées automatiquement

## 🔄 Compatibilité MAJ OpenClaw

Ce plugin est **indépendant** de `memory-lancedb` :

- Il n'est pas dans le dossier d'extensions d'OpenClaw
- Il ne sera pas écrasé par une MAJ
- Il partage la même base LanceDB sans conflit

## 📁 Structure du code

```
index.ts
├── Config & Types
├── French Triggers (patterns)
├── Text Processing (normalize, similarity)
├── LanceDB Wrapper (MemoryDB)
│   ├── store()
│   ├── search() [vectorielle]
│   ├── textSearch() [texte]
│   ├── deleteById()
│   └── deleteByQuery()
├── Embeddings Client (Mistral)
│   └── Détection dynamique de vectorDim
├── Stats Tracker (avec persistence JSON)
└── Plugin Definition
    ├── Tools (memory_store, memory_recall, memory_forget)
    ├── Hooks (before_agent_start, agent_end, session_end)
    └── Service (cleanup avec stop())
```

## 🐛 Débugging

Activer les logs détaillés :

```json
{
  "plugins": {
    "entries": {
      "memory-french": {
        "config": {
          "enableStats": true
        }
      }
    }
  }
}
```

Vérifier la base LanceDB :

```bash
sqlite3 ~/.openclaw/memory/lancedb/lance.db "SELECT COUNT(*) FROM memories"
```

Vérifier les stats :

```bash
cat ~/.openclaw/memory/memory-french-stats.json
```

## 📝 Dépendances

- `openai` : SDK OpenAI-compatible pour appeler l'API Mistral
- `@lancedb/lancedb` : Base de données vectorielle
- `@sinclair/typebox` : Définition de schéma pour les tools

## 🆕 v1.2.0 - Nouveautés

- **Tools autonomes** : `memory_store`, `memory_recall`, `memory_forget`
- **Hook session_end** : Capture même en cas de crash/kill
- **Statistiques persistantes** : Sauvegardées dans un fichier JSON
- **Détection dynamique vectorDim** : S'adapte à la dimension réelle des embeddings
- **Warning double injection** : Alerte si memory-lancedb a autoRecall activé
- **100% ESM** : Remplacement complet de `require()` par des `import`
- **Cleanup propre** : `registerService` avec `stop()` pour libérer les ressources
- **Documentation du conflit de schéma** : Commentaire expliquant les catégories spécifiques

## 🤝 Contribution

Issues et PRs bienvenues sur [GitHub](https://github.com/duan78/memory-french).

## 📄 Licence

ISC

## 👨‍💻 Auteur

**duan78** — Assistant IA d'Arnaud (expert web/SEO, France)

---

*Version 1.2.0 - 2026-03-18*
