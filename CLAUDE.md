# PREZ-APP

> **Petit prompt, grande présentation.**

Générateur de présentations HTML pédagogiques avec IA (Claude).

## Philosophie PREZ

### Principes directeurs

1. **Minimalisme radical** — Enlever le superflu. Un prompt, une couleur, un bouton. La présentation se génère.

2. **Filtre décisionnel** — Chaque fonctionnalité doit répondre à : *"Est-ce que cela aide l'enseignant à créer sa présentation ?"* Si non, elle n'existe pas.

3. **Accessibilité native** — Conçue pour les vidéoprojecteurs en salles de classe : contrastes forts, lisibilité maximale, mode contraste élevé (touche C).

4. **UX ultra-intuitive** — L'interface doit être comprise en 3 secondes. Pas de tutoriel, pas d'explication.

### Ce que PREZ n'est PAS

- Pas de surcharge fonctionnelle (pas d'éditeur Markdown complet)
- Pas de gestion de compte complexe (liste d'emails autorisés)
- Pas de persistence du token API (sécurité)
- Pas de features "au cas où"

*Petit prompt. Grande présentation.*

## Stack technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| Nuxt | 4.x | Framework fullstack |
| Nuxt UI | 4.x | Composants UI |
| Anthropic SDK | 0.73+ | API Claude |
| Tailwind CSS | CDN | Styles présentations |
| gray-matter | 4.x | Parsing frontmatter |

## Architecture

```
prez-app/
├── pages/
│   ├── index.vue          # Formulaire principal (3 champs max)
│   └── login.vue          # Email uniquement
├── server/
│   ├── api/
│   │   ├── generate.post.ts   # Claude → Markdown → Slides
│   │   └── render.post.ts     # Slides → HTML
│   └── utils/
│       ├── template.ts        # Template HTML présentation
│       └── palette.ts         # Palettes WCAG
├── types/
│   └── index.ts
└── assets/css/
    └── main.css
```

## Accessibilité (CRITICAL)

**Les présentations DOIVENT être lisibles par tous : sur vidéoprojecteur en salle éclairée, par des daltoniens, par des malvoyants.**

### Principes fondamentaux

1. **Contrastes suffisants** : Respecter WCAG AA (4.5:1 pour le texte, 3:1 pour les éléments graphiques). Valider avec `validatePalette()`.

2. **Navigation clavier complète** :
   | Touche | Action |
   |--------|--------|
   | ↓ / → / Espace / Entrée | Slide suivante |
   | ↑ / ← | Slide précédente |
   | Home | Première slide |
   | End | Dernière slide |
   | C | Mode contraste élevé |

3. **Mode contraste élevé** : Fond noir pur (#000), texte blanc pur (#FFF), accent conservé. Essentiel pour les vidéoprojecteurs en salles éclairées.

4. **Lisibilité maximale** :
   - Titres : 4xl-7xl (40-72px)
   - Corps : lg-2xl (18-24px)
   - Maximum 6 points par slide
   - Espacement généreux

5. **Touch targets** : 44×44px minimum pour les éléments interactifs (WCAG 2.5.5).

### Guidelines slides

- **Pas de paragraphes longs** — Phrases courtes, listes à puces
- **Hiérarchie visuelle claire** — Titre, numéro de slide, contenu
- **Respirer** — Beaucoup d'espace vide
- **1 idée = 1 slide** — Ne jamais surcharger

### Tests accessibilité

Avant toute modification du template :
1. Tester en mode contraste élevé (touche C)
2. Simuler daltonisme (DevTools > Rendering > Emulate vision deficiencies)
3. Valider ratios de contraste (4.5:1 minimum)
4. Tester navigation clavier complète

## Nuxt UI (conventions)

### Couleurs valides pour UButton
```typescript
// OK
'primary' | 'secondary' | 'neutral' | 'error' | 'success' | 'info' | 'warning'

// ❌ NE PAS UTILISER
'white' | 'black' | 'gray' | 'dark'
```

### Override styles Nuxt UI
Les composants Nuxt UI ont une spécificité élevée. Utiliser `!important` :
```vue
<UButton class="!bg-transparent !text-white hover:!bg-white/10">
```

## Sécurité

- **Token Claude API** : Jamais persisté, uniquement en session navigateur
- **Emails autorisés** : Liste dans `.env`, validation côté serveur
- **Session** : Côté client uniquement, pas de BDD

## Variables d'environnement

```env
SESSION_SECRET=change-this-in-production
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

### Lors de modifications UI

1. Conserver le minimalisme (3 champs max sur le formulaire)
2. Tester l'accessibilité (contraste, clavier, daltonisme)
3. Pas d'animations superflues
4. Pas de modals imbriquées

### Lors de modifications template slides

1. Conserver la navigation clavier
2. Conserver le mode contraste (touche C)
3. Valider les contrastes WCAG
4. Tester sur fond clair ET fond sombre
5. Maximum 6 points par slide dans le prompt système

### Code style

- TypeScript strict
- Composition API Vue.js
- Nuxt UI pour tous les composants
- Pas de dépendances inutiles

## Design des slides (référence : 741/2026-sfa-wordpress-gestion-medias)

### Structure d'une présentation

```
Slide 1 : Titre (hero)
├── Logo/icône centré
├── Titre 5xl-7xl bold
├── Sous-titre text-white/90
├── Tags en badges (bg-white/20 rounded-full)
└── Indicateur "Défiler" avec animation pulse

Slides 2-N : Contenu
├── Numéro "01 / Section" en font-mono accent
├── Titre 4xl-5xl avec mot-clé en accent
├── Layout 2 colonnes (texte | visuel)
└── Cartes arrondies avec bordures subtiles

Slide finale : Récapitulatif
├── Checklist visuelle
├── Call-to-action clair
└── Liens utiles
```

### Patterns visuels

| Élément | Classes Tailwind |
|---------|------------------|
| Slide titre | `gradient-accent` (dégradé basé sur couleur choisie) |
| Slides impaires | `bg-gray-900` |
| Slides paires | `bg-gray-800` |
| Cartes | `bg-slate-800/50 border border-slate-700 rounded-2xl p-6` |
| Badges | `px-4 py-2 bg-white/20 rounded-full text-sm` |
| Numéro slide | `text-accent font-mono text-base` |
| Accent texte | `text-accent` ou `<strong class="text-white">` |

### Typographie

- **Titres** : Inter 700-800, 4xl-7xl
- **Corps** : Inter 400, lg-xl, text-slate-300
- **Code** : JetBrains Mono, bg-slate-700 px-2 py-1 rounded
- **Numéros** : font-mono

### Animations (minimalistes)

- `fadeInUp` : Apparition slide titre
- `pulse-slow` : Indicateur "défiler"
- `transition-all` : Hover sur éléments interactifs
- **Pas d'animations complexes** — distraction inutile

### Icônes

- Emojis pour les sections (🗜️ ✂️ 🔄 💻)
- SVG inline pour les icônes UI
- Taille cohérente : w-5 h-5 (inline) ou text-4xl (emoji section)

### Couleurs sémantiques

```css
/* États */
.text-green-400   /* Succès, bonne pratique */
.text-red-400     /* Erreur, mauvaise pratique */
.text-yellow-400  /* Attention, avertissement */
.text-accent      /* Mot-clé, emphase */

/* Fonds */
.bg-green-500/10  /* Carte succès */
.bg-red-500/10    /* Carte erreur */
.bg-accent/10     /* Carte info accent */
```

### Règles de contenu

1. **Maximum 6 points** par slide (prompt IA)
2. **Pas de paragraphes** > 2 lignes
3. **1 concept = 1 slide**
4. **Comparaisons visuelles** (bon/mauvais côte à côte)
5. **Progression numérotée** (01, 02, 03...)
6. **Exemples concrets** avec code ou visuels
