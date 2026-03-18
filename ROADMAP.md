# memory-french — Roadmap

## v2.0 — Plugin 100% autonome

### Objectif
Supprimer toute dépendance à memory-lancedb. memory-french gère sa propre DB, sa propre config, ses propres tools.

### Changements
- [ ] Propre table LanceDB (`memories_fr`) au lieu de partager `memories`
- [ ] Propre config embedding dans `plugins.entries.memory-french.config` (plus lire celle de memory-lancedb)
- [ ] Propre schéma étendu : dates, source, catégorie étendue, importance pondérée
- [ ] GC automatique : purge mémos > 30j avec importance < 0.5
- [ ] Export/Import JSON pour backup
- [ ] Migration tool : importer les mémos existants de la table memory-lancedb
- [ ] Slot memory : utiliser `kind: "memory"` pour remplacer memory-lancedb
- [ ] Désactiver memory-lancedb dans la config
- [ ] Tests automatisés

### Contraintes
- Garder LanceDB comme moteur vectoriel
- Compatible MAJ OpenClaw
- Backup/restore des données
