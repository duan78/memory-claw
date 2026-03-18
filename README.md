# memory-french

Plugin OpenClaw pour la capture et le rappel automatique de mémos en français via LanceDB + Mistral Embeddings.

## Pourquoi ?

Le plugin officiel `memory-lancedb` a un auto-capture basé sur des patterns regex en anglais/tchèque qui ne matchent pas le français. Ce plugin complète la mémoire avec :

- **Patterns français larges** : préférences, décisions, faits, entités
- **Triggers tech** : configuration, serveur, API, déploiement, etc.
- **Anti-bruit** : filtre les injections de contexte, les métadonnées système
- **Compatible Mistral Embeddings** : fonctionne avec `mistral-embed` via l'API OpenAI-compatible

## Installation

1. Cloner dans le workspace OpenClaw :
   ```bash
   git clone https://github.com/duan78/memory-french.git ~/.openclaw/workspace/plugins/memory-french
   cd ~/.openclaw/workspace/plugins/memory-french
   npm install
   ```

2. Ajouter dans `openclaw.json` :
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

3. Redémarrer le gateway :
   ```bash
   openclaw gateway restart
   ```

## Configuration

Le plugin réutilise la config embedding de `memory-lancedb` (même base LanceDB, même clé API Mistral). Aucune config supplémentaire n'est nécessaire si `memory-lancedb` est déjà configuré.

## Compatibilité MAJ OpenClaw

Ce plugin est **indépendant** de `memory-lancedb` — il n'est pas dans le dossier d'extensions d'OpenClaw et ne sera pas écrasé par une MAJ. Il survit aux mises à jour.

## Dépendances

- `openai` (SDK OpenAI-compatible pour appeler l'API Mistral)
- `@lancedb/lancedb` (base de données vectorielle)

## Auteur

Sam ⚡ — assistant IA d'Arnaud
