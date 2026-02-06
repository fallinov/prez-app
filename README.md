# PREZ

> Petit prompt, grande présentation.

Génère des présentations HTML pédagogiques avec Claude AI.

**Version** : 1.2.0

## Fonctionnalités

- **Triple passe IA** : Génération → Relecture → Revue UX/accessibilité
- **Éditeur de slides** : Modification slide par slide avec aperçu en temps réel
- **Palette WCAG** : Génération et édition des couleurs accessibles
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
5. Cliquer "Éditer" pour modifier slide par slide
6. Télécharger le HTML

## Pipeline de génération

```
Palette WCAG → Génération Markdown → Relecture → Rendu HTML → Revue UX → Sauvegarde
```

## Interface

| Page | Description |
|------|-------------|
| `/` | Formulaire de génération + liste des présentations |
| `/editor/[filename]` | Éditeur slide par slide avec aperçu |
| `/login` | Authentification par email |

## Raccourcis (présentation)

| Touche | Action |
|--------|--------|
| ↓ → Espace | Slide suivante |
| ↑ ← | Slide précédente |
| Home | Première slide |
| End | Dernière slide |
| C | Mode contraste élevé |

## Raccourcis (éditeur)

| Touche | Action |
|--------|--------|
| ↑ ↓ | Navigation entre slides |
| ⌘/Ctrl + Enter | Envoyer le prompt |
| Escape | Retour à l'accueil |

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
- Tailwind CSS
- Lucide Icons (CDN)
- Design System FESOU (thème clair)
