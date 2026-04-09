# PREZ-APP

<!-- Documentation détaillée dans docs/ -->

Projet **ESIG** — contexte institutionnel, plans de cours et stack technique : voir `~/ESIG/CLAUDE.md`.

> **Petit prompt, grande présentation.**

Générateur de présentations HTML pédagogiques avec IA (Claude).

**Version** : 1.2.0

## Philosophie PREZ

1. **Minimalisme radical** — Un prompt, une couleur, un bouton. La présentation se génère.
2. **Filtre décisionnel** — *"Est-ce que cela aide l'enseignant à créer sa présentation ?"* Si non, elle n'existe pas.
3. **Accessibilité native** — Contrastes forts, lisibilité maximale, mode contraste élevé (touche C).
4. **UX ultra-intuitive** — Comprise en 3 secondes. Pas de tutoriel.

**Ce que PREZ n'est PAS** : pas d'éditeur Markdown complet, pas de gestion de compte complexe, pas de features "au cas où".

## Fonctionnalités principales

| Fonctionnalité | Description |
|----------------|-------------|
| **Triple passe IA** | Génération → Relecture → Revue UX/accessibilité |
| **Éditeur slide par slide** | Modifier chaque slide avec aperçu temps réel |
| **Palette WCAG éditable** | 5 couleurs générées et modifiables |
| **Sélecteur de modèle** | Sonnet 4, Opus 4, Haiku 3.5 |
| **Vidéos YouTube/Vimeo** | Embed responsive avec un simple lien |
| **Icônes Lucide** | Remplacent les emojis pour un rendu pro |
| **Mode contraste** | Touche C pour vidéoprojecteurs |
| **Design System FESOU** | Interface admin thème clair |

## Pipeline de génération

```
Palette WCAG (Haiku) → Markdown (choix modèle) → Relecture → HTML (template.ts) → Revue UX (Haiku) → Sauvegarde
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
| Tailwind CSS | 4.x | Styles admin + présentations |
<!-- ATTENTION : Lucide Icons via CDN contredit la règle de souveraineté. Acceptable pour les slides générées (runtime navigateur). -->
| Lucide Icons | CDN | Icônes professionnelles |

## Architecture

```
prez-app/
├── pages/
│   ├── index.vue              # Formulaire + liste présentations
│   ├── login.vue              # Auth email
│   └── editor/
│       └── [filename].vue     # Éditeur slide par slide
├── server/
│   ├── api/
│   │   ├── generate.post.ts       # IA: Palette + Markdown + relecture
│   │   ├── render.post.ts         # HTML + revue UX
│   │   ├── presentations/
│   │   │   └── [filename].get.ts  # Charger une présentation
│   │   ├── improve.post.ts        # Améliorer toute la présentation
│   │   ├── improve-slide.post.ts  # Améliorer un slide spécifique
│   │   ├── preview-slide.post.ts  # Aperçu d'un slide isolé
│   │   ├── update-palette.post.ts # Mettre à jour la palette
│   │   └── regenerate-palette.post.ts # Régénérer la palette WCAG
│   └── utils/
│       ├── template.ts            # Template HTML présentations
│       └── palette.ts             # Palettes WCAG
├── types/
│   └── index.ts
├── assets/css/
│   ├── main.css                   # Import Tailwind + Nuxt UI
│   └── prez-palette.css           # Design System FESOU
└── public/generated/              # Présentations générées (HTML + JSON)
```

## Design System FESOU

Interface admin en thème clair avec palette emerald : `--color-accent` (#059669), `--color-muted-50` (#F8FAFC), `--color-muted-950` (#0B1220), `--color-border` (#CBD5E1).

Classes Tailwind : `bg-accent`, `text-accent`, `border-accent`, `bg-muted-50` à `bg-muted-950`.

## Accessibilité (CRITICAL)

**Les présentations DOIVENT être lisibles sur vidéoprojecteur en salle éclairée, par des daltoniens, par des malvoyants.**

### Navigation clavier

| Contexte | Touches |
|----------|---------|
| Présentation | ↓/→/Espace/Entrée (suivant), ↑/← (précédent), Home/End, C (contraste) |
| Éditeur | ↑/↓ (naviguer slides), ⌘/Ctrl+Enter (envoyer prompt), Escape (retour) |

### Principes

1. **Contrastes WCAG AA** : 4.5:1 texte, 3:1 graphiques
2. **Mode contraste élevé** : Fond #000, texte #FFF
3. **Lisibilité** : Titres 4xl-7xl, corps lg-2xl, max 6 points/slide
4. **Touch targets** : 44x44px minimum

## Syntaxe Markdown PREZ

Voir **`docs/markdown-syntax.md`** pour la documentation complète : blocs (intro, cards, steps, etc.), vidéos, liens, cartes couleurs, symboles, design des slides et classes Tailwind.

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

### Ajout de fonctionnalités

1. "Est-ce que ça aide à créer une présentation ?" → **Non** = ne pas implémenter
2. **Oui** = implémenter de la manière la plus simple possible

### Modifications template

- Conserver navigation clavier + mode contraste (touche C)
- Valider contrastes WCAG, max 6 points/slide

### Modifications interface admin

- Utiliser les variables du design system FESOU (`prez-palette.css`)
- Thème clair uniquement (pas de dark mode admin)
- Couleur accent emerald (#059669)
- Nuxt UI pour tous les composants

> Les conventions générales (TypeScript, Composition API, accessibilité) sont dans `~/.claude/rules/`.
