# PREZ

> Petit prompt, grande présentation.

Génère des présentations HTML pédagogiques avec Claude AI.

**Version** : 1.0.0

## Fonctionnalités

- **Double passe IA** : Génération puis relecture automatique
- **Images automatiques** : Loremflickr via mots-clés anglais
- **Vidéos intégrées** : YouTube et Vimeo
- **Liens cliquables** : Syntaxe Markdown standard
- **Icônes professionnelles** : Lucide Icons (pas d'emojis)
- **Mode contraste** : Pour vidéoprojecteurs (touche C)
- **Export HTML** : Fichier autonome, aucune dépendance

## Démarrage

```bash
npm install
npm run dev
```

## Utilisation

1. Se connecter (email ESIG)
2. Coller sa clé API Claude
3. Décrire la présentation
4. Télécharger le HTML

## Raccourcis (présentation)

| Touche | Action |
|--------|--------|
| ↓ → Espace | Slide suivante |
| ↑ ← | Slide précédente |
| Home | Première slide |
| End | Dernière slide |
| C | Mode contraste élevé |

## Syntaxe Markdown

L'IA utilise une syntaxe enrichie :

```markdown
# Titre de la slide

:::intro
Citation ou accroche
:::

:::cards
[Option 1|blue] Description
[Option 2|green] Description
:::

:::image mountain lake switzerland
Légende de l'image
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
- Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- Tailwind CSS (CDN)
- Lucide Icons (CDN)
