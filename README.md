# PREZ

> Petit prompt, grande présentation.

Génère des présentations HTML pédagogiques avec Claude AI.

**Version** : 1.1.0

## Fonctionnalités

- **Triple passe IA** : Génération → Relecture → Revue UX/accessibilité
- **Sélecteur de modèle** : Sonnet 4, Opus 4, Haiku 3.5
- **Vidéos intégrées** : YouTube et Vimeo
- **Liens cliquables** : Syntaxe Markdown standard
- **Icônes professionnelles** : Lucide Icons
- **Mode contraste** : Pour vidéoprojecteurs (touche C)
- **Export HTML** : Fichier autonome

## Démarrage

```bash
npm install
npm run dev
```

## Utilisation

1. Se connecter (email ESIG)
2. Coller sa clé API Claude
3. Choisir le modèle IA
4. Décrire la présentation
5. Télécharger le HTML

## Pipeline de génération

```
Génération Markdown → Relecture → Rendu HTML → Revue UX → Sauvegarde
```

## Raccourcis (présentation)

| Touche | Action |
|--------|--------|
| ↓ → Espace | Slide suivante |
| ↑ ← | Slide précédente |
| Home | Première slide |
| End | Dernière slide |
| C | Mode contraste élevé |

## Syntaxe Markdown

```markdown
# Titre de la slide

:::intro
Citation ou accroche
:::

:::cards
[Option 1|blue] Description
[Option 2|green] Description
:::

:::video https://youtube.com/watch?v=xxx:::

[Lien externe](https://example.com)
```

## Configuration

```env
ALLOWED_EMAILS=steve@esig.ch,collegue@esig.ch
```

## Stack technique

- Nuxt 4 + Nuxt UI 3
- Claude API (Sonnet 4, Opus 4, Haiku 3.5)
- Tailwind CSS (CDN)
- Lucide Icons (CDN)
