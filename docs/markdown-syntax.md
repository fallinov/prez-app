# Syntaxe Markdown PREZ

## Blocs de contenu

```markdown
:::intro              # Bloc d'introduction avec citation
:::sidebar Titre      # Panneau latéral avec liste
:::cards              # Grille de cartes avec couleurs
:::compare            # Barres de progression comparatives
:::stats              # Statistiques côte à côte
:::steps              # Étapes numérotées avec badges
:::points             # Points avec icônes
:::tip                # Conseil mis en valeur
```

## Vidéos

```markdown
:::video https://youtube.com/watch?v=xxx:::
:::video https://vimeo.com/xxx:::
```

## Liens

```markdown
[TinyPNG](https://tinypng.com)
[Squoosh](https://squoosh.app)
```

## Cartes avec couleurs

```markdown
[TITRE|yellow]   # yellow, blue, green, red, purple, orange, accent
```

## Symboles

- `✓` → point positif (vert)
- `✗` → point négatif (rouge)
- `→` → action/étape
- Emojis → convertis en icônes Lucide

## Images (DÉSACTIVÉ)

Les images via `:::image:::` sont temporairement désactivées (service Loremflickr non fiable).

## Design des slides

### Structure

```
Slide 1 : Titre (hero)
├── Titre 5xl-7xl bold
├── Sous-titre text-white/90
├── Tags en badges
└── Indicateur "Défiler"

Slides 2-N : Contenu
├── Numéro "01 / Section"
├── Titre avec mot-clé en accent
└── Cartes/listes/comparaisons

Slide finale : Récapitulatif
├── Checklist (:::steps)
└── Liens utiles
```

### Classes Tailwind

| Élément | Classes |
|---------|---------|
| Slide titre | `gradient-accent` |
| Slides impaires | `bg-slate-900` |
| Slides paires | `bg-slate-800` |
| Cartes | `bg-slate-800/50 border border-slate-700 rounded-2xl` |
| Accent texte | `text-accent` |

### Icônes

- **Lucide Icons** via CDN
- Emojis convertis automatiquement
- Format : `<i data-lucide="icon-name"></i>`
