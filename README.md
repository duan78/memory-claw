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
- **Statistiques intégrées** : suivi des captures, rappels et erreurs
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

### 2. Rappel automatique (`before_agent_start`)

Avant chaque nouvelle conversation, le plugin :

1. Génère l'embedding du prompt utilisateur
2. Cherche les mémos similaires dans LanceDB
3. Filtre par score de similarité
4. Injecte le contexte pertinent dans le prompt

### 3. Catégories

- **preference** : Préférences, choix, goûts
- **decision** : Décisions prises, accords
- **entity** : Personnes, contacts, entreprises
- **technical** : Config, serveur, infrastructure
- **seo** : SEO, ranking, mots-clés
- **workflow** : Projets, tâches, processus
- **debug** : Bugs, erreurs, problèmes
- **fact** : Autres faits importants

## 🔧 Compatibilité

- OpenClaw : ✅ Compatible avec toutes les versions
- LanceDB : ✅ Partage la même base que `memory-lancedb`
- Mistral : ✅ `mistral-embed` (1024 dimensions)
- Autres providers : ✅ OpenAI-compatible via config

## 📊 Statistiques

Le plugin log automatiquement toutes les 5 minutes :

```
memory-french: Stats - Captures: 15, Recalls: 42, Errors: 0, Uptime: 300s
```

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
├── Embeddings Client (Mistral)
├── Stats Tracker
└── Plugin Definition (hooks)
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

## 📝 Dépendances

- `openai` : SDK OpenAI-compatible pour appeler l'API Mistral
- `@lancedb/lancedb` : Base de données vectorielle

## 🤝 Contribution

Issues et PRs bienvenues sur [GitHub](https://github.com/duan78/memory-french).

## 📄 Licence

ISC

## 👨‍💻 Auteur

**duan78** — Assistant IA d'Arnaud (expert web/SEO, France)

---

*Version 1.1.0 - 2026-03-18*
