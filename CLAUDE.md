# PREZ-APP

> **Petit prompt, grande présentation.**

Générateur de présentations HTML pédagogiques avec IA (Claude).

**Version** : 1.1.0

## Philosophie PREZ

### Principes directeurs

1. **Minimalisme radical** — Enlever le superflu. Un prompt, une couleur, un bouton. La présentation se génère.

2. **Filtre décisionnel** — Chaque fonctionnalité doit répondre à : *"Est-ce que cela aide l'enseignant à créer sa présentation ?"* Si non, elle n'existe pas.

3. **Accessibilité native** — Conçue pour les vidéoprojecteurs en salles de classe : contrastes forts, lisibilité maximale, mode contraste élevé (touche C).

4. **UX ultra-intuitive** — L'interface doit être comprise en 3 secondes. Pas de tutoriel, pas d'explication.

### Ce que PREZ n'est PAS

- Pas de surcharge fonctionnelle (pas d'éditeur Markdown complet)
- Pas de gestion de compte complexe (liste d'emails autorisés)
- Pas de features "au cas où"

*Petit prompt. Grande présentation.*

## Fonctionnalités principales

| Fonctionnalité | Description |
|----------------|-------------|
| **Triple passe IA** | Génération → Relecture → Revue UX/accessibilité |
| **Sélecteur de modèle** | Sonnet 4, Opus 4, Haiku 3.5 |
| **Vidéos YouTube/Vimeo** | Embed responsive avec un simple lien |
| **Liens cliquables** | Syntaxe Markdown `[texte](url)` supportée |
| **Icônes Lucide** | Remplacent les emojis pour un rendu pro |
| **Mode contraste** | Touche C pour vidéoprojecteurs |
| **Persistance clé API** | Stockée en localStorage (optionnel) |
| **Modal de progression** | 5 étapes visibles + bouton annuler |

## Pipeline de génération

```
1. Génération Markdown     (Sonnet/Opus/Haiku selon choix)
         ↓
2. Relecture Markdown      (même modèle)
         ↓
3. Rendu HTML              (template.ts)
         ↓
4. Revue UX/Accessibilité  (Haiku - rapide)
         ↓
5. Sauvegarde
```

## Modèles IA disponibles

| Modèle | ID | Usage |
|--------|-----|-------|
| Sonnet 4 | `claude-sonnet-4-20250514` | Recommandé (équilibré) |
| Opus 4 | `claude-opus-4-20250514` | Plus puissant (lent + cher) |
| Haiku 3.5 | `claude-3-5-haiku-20241022` | Rapide (économique) |

## Stack technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| Nuxt | 4.x | Framework fullstack |
| Nuxt UI | 3.x | Composants UI |
| Anthropic SDK | 0.73+ | API Claude |
| Tailwind CSS | CDN | Styles présentations |
| Lucide Icons | CDN | Icônes professionnelles |

## Architecture

```
prez-app/
├── pages/
│   ├── index.vue          # Formulaire principal
│   └── login.vue          # Auth email
├── server/
│   ├── api/
│   │   ├── generate.post.ts   # IA: Markdown + relecture
│   │   └── render.post.ts     # HTML + revue UX
│   └── utils/
│       ├── template.ts        # Template HTML
│       └── palette.ts         # Palettes WCAG
├── types/
│   └── index.ts
└── assets/css/
    └── main.css
```

## Accessibilité (CRITICAL)

**Les présentations DOIVENT être lisibles par tous : sur vidéoprojecteur en salle éclairée, par des daltoniens, par des malvoyants.**

### Navigation clavier

| Touche | Action |
|--------|--------|
| ↓ / → / Espace / Entrée | Slide suivante |
| ↑ / ← | Slide précédente |
| Home | Première slide |
| End | Dernière slide |
| C | Mode contraste élevé |

### Principes

1. **Contrastes WCAG AA** : 4.5:1 pour le texte, 3:1 pour les graphiques
2. **Mode contraste élevé** : Fond noir pur (#000), texte blanc (#FFF)
3. **Lisibilité** : Titres 4xl-7xl, corps lg-2xl, max 6 points/slide
4. **Touch targets** : 44×44px minimum

## Syntaxe Markdown PREZ

### Blocs de contenu

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

### Vidéos

```markdown
:::video https://youtube.com/watch?v=xxx:::
:::video https://vimeo.com/xxx:::
```

### Liens

```markdown
[TinyPNG](https://tinypng.com)
[Squoosh](https://squoosh.app)
```

### Cartes avec couleurs

```markdown
[TITRE|yellow]   # yellow, blue, green, red, purple, orange, accent
```

### Symboles

- `✓` → point positif (vert)
- `✗` → point négatif (rouge)
- `→` → action/étape
- Emojis → convertis en icônes Lucide

### Images (DÉSACTIVÉ)

Les images via `:::image:::` sont temporairement désactivées (service Loremflickr non fiable).

## Sécurité

- **Token Claude API** : Stocké en localStorage (optionnel, effaçable)
- **Emails autorisés** : Liste dans `.env`, validation côté serveur
- **Session** : Côté client uniquement, pas de BDD

## Variables d'environnement

```env
ALLOWED_EMAILS=steve@esig.ch,collegue@esig.ch
```

## Commandes

```bash
npm run dev    # localhost:3000
npm run build  # Production
```

## Instructions pour Claude

### Lors d'ajout de fonctionnalités

1. **Demander** : "Est-ce que ça aide à créer une présentation ?"
2. **Si non** : Ne pas l'implémenter
3. **Si oui** : L'implémenter de la manière la plus simple possible

### Lors de modifications template

1. Conserver la navigation clavier
2. Conserver le mode contraste (touche C)
3. Valider les contrastes WCAG
4. Maximum 6 points par slide

### Code style

- TypeScript strict
- Composition API Vue.js
- Nuxt UI pour tous les composants

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
