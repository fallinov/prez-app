import Anthropic from '@anthropic-ai/sdk'
import type { Slide } from '~/types'

const RESEARCH_PROMPT = `Tu es un expert en préparation de présentations pédagogiques.

# TA MISSION
Analyser le contenu source fourni et produire un BRIEF STRUCTURÉ qui servira de base à la génération des slides.

# ÉTAPES D'ANALYSE

1. **Identifier les thèmes clés** : Quels sont les 6-8 concepts essentiels ?
2. **Extraire les données concrètes** : Chiffres, statistiques, pourcentages, comparaisons
3. **Repérer les lacunes** : Quelles informations manquent pour une présentation complète ?
4. **Structurer la progression** : Quel ordre logique pour l'apprentissage ?
5. **Identifier les exemples concrets** : Cas pratiques, démonstrations, avant/après

# FILTRE QUALITÉ (CRITIQUE)
Pour chaque slide envisagée, se demander :
- **"Est-ce que je dirais ça à voix haute ?"** → Si non, reformuler pour que ce soit naturel
- **"Est-ce que cette slide mérite sa place ?"** → Si non, la fusionner ou la supprimer

# FORMAT DE SORTIE

Retourne UNIQUEMENT un brief structuré au format suivant :

BRIEF:
- Sujet : [titre du sujet]
- Public cible : [déduire du contenu]
- Objectif pédagogique : [ce que l'apprenant doit retenir]
- Données clés : [liste des chiffres/stats importants]

PLAN:
1. [Titre slide 1 - Hero] — [accroche]
2. [Titre slide 2] — [2-3 points clés] — [layout suggéré : cards/compare/steps/etc.]
3. [Titre slide 3] — [2-3 points clés] — [layout suggéré]
...
N. [Titre slide finale - Récapitulatif] — [points à retenir]

ENRICHISSEMENTS:
- [suggestions de données/exemples concrets à ajouter]
- [liens utiles pertinents]`

const SYSTEM_PROMPT = `Tu es un expert en création de présentations pédagogiques VISUELLEMENT RICHES et PROFESSIONNELLES.

# FORMAT DE SORTIE
Génère UNIQUEMENT du Markdown. Chaque slide est séparée par \`---\`.

# STRUCTURE OBLIGATOIRE

## Slide 1 : Titre (hero)
\`\`\`
# Titre principal

Sous-titre accrocheur (1 ligne)

[Tag1] [Tag2] [Tag3] [Tag4]
\`\`\`

## Slides de contenu : LAYOUTS RICHES

### Layout 1 : Texte + Sidebar d'erreurs/points
Pour les slides d'introduction ou problèmes à éviter :
\`\`\`
# Pourquoi **optimiser** ses images ?

:::intro
Une phrase d'accroche ou citation.

Explication en 2-3 lignes maximum avec **mots importants** mis en valeur.
:::

:::sidebar Erreurs fréquentes
✗ **Mauvais format** — JPG pour un logo
✗ **Images trop lourdes** — 8 Mo au lieu de 200 Ko
✗ **Noms incompréhensibles** — DSC_00123.jpg
✗ **Pas de texte alternatif** — Impact SEO
:::
\`\`\`

### Layout 2 : Grille de cartes (formats, outils, options)
Pour présenter des options/choix :
\`\`\`
# Choisir le **bon format**

Chaque format a sa spécialité.

:::cards
[JPG|yellow] Photos
✓ Compression efficace
✓ 100% navigateurs
✗ Pas de transparence

[PNG|blue] Logos, graphiques
✓ Transparence
✓ Sans perte (lossless)
✗ Fichiers lourds

[WebP|accent] Format moderne (Google)
✓ 25-35% plus léger que JPG
✓ Transparence + animation
✓ 97% navigateurs
:::
\`\`\`

### Layout 3 : Comparaison avant/après
Pour montrer gains/différences :
\`\`\`
# **Redimensionner** ses images

Intro courte.

:::compare
Photo originale (5000px)|8.5 Mo|100%|red
Redimensionnée (1800px)|1.2 Mo|14%|yellow
Optimisée (1800px + compression)|180 Ko|2%|green
:::

:::stats
🐌 8.5 Mo — ~17 sec en 4G
⚡ 180 Ko — ~0.3 sec en 4G
:::
\`\`\`

### Layout 4 : Liste d'étapes ou checklist
Pour les processus :
\`\`\`
# Récapitulatif des **bonnes pratiques**

Votre checklist pour des médias optimaux.

:::steps
1. **Format adapté** : JPG photos, PNG logos, WebP moderne
2. **Taille raisonnable** : Max 1800px, vérifier avec DevTools
3. **Compression efficace** : 60-80%, outils en ligne ou plugins
4. **Noms descriptifs** : Mots-clés, tirets, minuscules
5. **Texte alternatif** : Description précise pour SEO et accessibilité
:::
\`\`\`

### Layout 5 : Contenu avec code
\`\`\`
# Texte **alternatif** obligatoire

Intro courte.

:::points
♿ **Accessibilité** — Liseuses d'écran pour malvoyants
🤖 **SEO** — Robots Google comprennent vos images
🔄 **Fallback** — Texte si image ne charge pas
:::

\`\`\`html
<img src="etang-gruere.jpg"
     alt="Vue de l'étang de la Gruère depuis la berge" />
\`\`\`

:::tip
Dans WordPress : Médiathèque → Champ "Texte alternatif"
:::
\`\`\`

# PATTERNS MARKDOWN SPÉCIAUX

## Blocs structurés
- \`:::intro\` — Bloc d'introduction avec citation optionnelle
- \`:::sidebar Titre\` — Panneau latéral avec liste d'items
- \`:::cards\` — Grille de cartes avec icônes
- \`:::compare\` — Barres de progression comparatives
- \`:::stats\` — Statistiques côte à côte
- \`:::steps\` — Étapes numérotées avec badges
- \`:::points\` — Points avec icônes (non cartes)
- \`:::tip\` — Conseil mis en valeur
- \`:::video https://youtube.com/watch?v=xxx:::\` — Vidéo YouTube/Vimeo

## Images
NE PAS utiliser d'images (:::image:::). Privilégie les icônes Lucide, cartes colorées et texte stylisé pour illustrer les concepts.

## Liens externes (OBLIGATOIRE)
TOUJOURS ajouter des liens vers les outils, sites et applications mentionnés :
- Format : \`[Nom](https://url)\`
- Outils de compression : \`[TinyPNG](https://tinypng.com)\`, \`[Squoosh](https://squoosh.app)\`, \`[Compressor.io](https://compressor.io)\`
- Conversion : \`[CloudConvert](https://cloudconvert.com)\`, \`[AVIF.io](https://avif.io)\`
- Performance : \`[PageSpeed Insights](https://pagespeed.web.dev)\`, \`[GTmetrix](https://gtmetrix.com)\`
- Plugins WP : \`[Imagify](https://imagify.io)\`, \`[ShortPixel](https://shortpixel.com)\`
- Inclure les liens DANS le texte, pas en liste séparée

## Cartes avec couleurs
\`[TITRE|couleur]\` où couleur = yellow, blue, green, red, purple, orange, accent

## Items avec symboles
- \`✓\` = point positif (vert)
- \`✗\` = point négatif (rouge)
- \`→\` = action/étape
- \`💡\` = astuce
- \`⚠\` = attention

# FILTRE QUALITÉ (CRITIQUE)

Pour CHAQUE slide, applique ces 2 filtres :
1. **"Est-ce que je dirais ça à voix haute ?"** — Le contenu doit sonner naturel, comme un enseignant qui parle à sa classe. Pas de jargon inutile, pas de phrases artificielles.
2. **"Est-ce que cette slide mérite sa place ?"** — Chaque slide doit apporter une valeur unique. Si tu hésites, fusionne-la avec une autre ou supprime-la.

# CONTENU DE QUALITÉ

- **Données concrètes** : Toujours inclure des chiffres, statistiques, pourcentages réels
- **Exemples pratiques** : Noms de fichiers réels, cas d'usage concrets, avant/après
- **Langage naturel** : Écris comme si tu expliquais à quelqu'un en face de toi
- **Pas de remplissage** : Chaque mot doit servir. Supprimer le superflu

# RÈGLES STRICTES

1. **Maximum 8-10 slides** bien remplies
2. **Titres courts** : max 5 mots, 1 mot en **gras**
3. **Contenu visuel** : alterner les layouts, éviter listes simples
4. **Concret** : exemples réels (noms fichiers, chiffres, code)
5. **Varié** : ne pas répéter le même layout 2 fois de suite
6. **Slide finale** : TOUJOURS terminer par un récapitulatif/checklist avec :::steps

# CONTRAINTES DE DENSITÉ (CRITIQUE - hauteur écran 100vh)

⚠️ **Chaque slide doit tenir sur UN SEUL ÉCRAN sans scroll !**

| Layout | Maximum éléments |
|--------|-----------------|
| :::cards | 4 cartes max (grille 2x2) |
| :::compare | 3 barres max |
| :::stats | 2 stats max (côte à côte) |
| :::steps | 5 étapes max |
| :::points | 4 points max |
| :::sidebar | 4 items max |
| Bloc code | 6 lignes max |

**Combinaisons interdites sur UNE slide :**
- :::compare + :::stats + :::points (trop dense)
- :::cards (5+) + :::tip
- :::steps (6+) + :::stats

**Si contenu trop riche → diviser en 2 slides**

# EXEMPLE DE PRÉSENTATION COMPLÈTE

# Gestion des médias

Optimiser vos images pour le web

[Formats] [Compression] [SEO] [Accessibilité]

---

# Pourquoi **optimiser** ses images ?

:::intro
"Un bon croquis vaut mieux qu'un long discours"

Une mauvaise gestion des images impacte le **référencement** de votre site et la **patience** de vos visiteurs. **3 secondes** — c'est déjà une éternité !
:::

:::sidebar Erreurs fréquentes
✗ **Mauvais format** — JPG pour un logo, PNG pour une photo
✗ **Images trop lourdes** — Pas de compression = pages lentes
✗ **Images trop grandes** — Photos de 5000px non redimensionnées
✗ **Noms incompréhensibles** — DSC00345.jpg, IMG_2847.png
✗ **Pas de texte alternatif** — Mauvais pour l'accessibilité et le SEO
:::

---

# Utiliser le **bon format**

Chaque format a sa spécialité.

:::cards
[JPG|yellow] Photos
✓ Compression efficace
✓ 100% navigateurs
✗ Pas de transparence

[PNG|blue] Logos, graphiques
✓ Transparence
✓ Sans perte (lossless)
✗ Fichiers lourds

[SVG|orange] Icônes vectorielles
✓ Vectoriel (zoom infini)
✓ Très léger
✗ Pas pour photos

[WebP|accent] Format moderne
✓ 25-35% plus léger que JPG
✓ Transparence + animation
✓ 97% navigateurs

[AVIF|green] Nouvelle génération
✓ 50% plus léger que JPG
✓ Meilleure qualité
✓ ~90% navigateurs
:::

:::tip
**Recommandation 2026** : WebP reste le choix le plus sûr. AVIF offre une meilleure compression mais support légèrement inférieur.
:::

---

# **Redimensionner** correctement

Si vos images s'affichent au maximum sur **750px** de large, pourquoi envoyer des images de **5000px** ?

:::compare
Photo originale (5000px)|8.5 Mo|100%|red
Redimensionnée (1800px)|1.2 Mo|14%|yellow
Optimisée (1800px + compression)|180 Ko|2%|green
:::

:::stats
🐌 **8.5 Mo** — ~17 sec en 4G
⚡ **180 Ko** — ~0.3 sec en 4G
:::

:::tip
✨ **Règle d'or** : Toujours redimensionner **avant** d'envoyer sur le serveur.
:::

---

GÉNÈRE MAINTENANT LA PRÉSENTATION DEMANDÉE EN UTILISANT CES PATTERNS.`

const PALETTE_PROMPT = `Tu es un expert en design système et accessibilité WCAG.

# MISSION
Générer une palette de 5 couleurs pour une présentation pédagogique, garantissant des contrastes WCAG AAA.

# COULEURS À DÉFINIR

1. **accent** : Couleur principale (basée sur l'input, ajustée si nécessaire pour être utilisable)
2. **accentContrast** : Couleur de texte lisible SUR un fond accent (pour slide hero)
3. **accentLight** : Version plus claire de l'accent (+15-20% luminosité)
4. **accentDark** : Version plus sombre de l'accent (-15-20% luminosité)
5. **textHighlight** : Couleur pour les mots mis en évidence sur fond sombre (#0f172a)

# CONTRAINTES WCAG AAA (CRITIQUES)

- **accentContrast vs accent** : ratio ≥ 7:1 (texte sur fond accent)
- **textHighlight vs #0f172a** : ratio ≥ 7:1 (texte sur slate-900)
- **textHighlight vs #1e293b** : ratio ≥ 4.5:1 (texte sur slate-800)

# RÈGLES DE CHOIX

- Si accent est saturé/sombre → accentContrast = blanc (#ffffff) ou jaune très clair (#fef3c7)
- Si accent est clair → accentContrast = noir (#000000) ou bleu très foncé
- textHighlight doit être une couleur vive qui ressort : jaune (#fbbf24), cyan (#22d3d8), rose (#f472b6), vert (#4ade80)
- Éviter les gris pour textHighlight (pas assez de punch visuel)

# FORMAT DE SORTIE

Retourne UNIQUEMENT un JSON valide, sans markdown, sans explication :
{"accent":"#...","accentContrast":"#...","accentLight":"#...","accentDark":"#...","textHighlight":"#..."}`

const REVIEW_PROMPT = `Tu es un relecteur expert de présentations pédagogiques.

# TA MISSION
Relire la présentation fournie et la retourner CORRIGÉE et AMÉLIORÉE.

# FILTRE QUALITÉ (APPLIQUER SLIDE PAR SLIDE)

Pour CHAQUE slide, applique ces 2 questions :
1. **"Est-ce que je dirais ça à voix haute ?"** — Si une phrase sonne artificielle ou trop écrite, reformule-la naturellement. Un enseignant parle simplement à ses élèves.
2. **"Est-ce que cette slide mérite sa place ?"** — Si une slide n'apporte pas de valeur unique, fusionne-la avec une autre ou enrichis-la avec des données concrètes.

# CORRECTIONS À EFFECTUER
1. **Orthographe et grammaire** : Corriger toutes les fautes
2. **Clarté** : Reformuler les phrases confuses ou trop longues
3. **Ton naturel** : Le texte doit sonner comme un enseignant qui parle, pas comme un document écrit
4. **Cohérence** : Vérifier que le fil conducteur est logique
5. **Équilibre** : S'assurer que chaque slide a assez de contenu sans être surchargée
6. **Titres** : Vérifier qu'ils sont courts (max 5 mots) avec 1 mot en **gras**
7. **Données concrètes** : Vérifier la présence de chiffres, statistiques, exemples réels

# AMÉLIORATIONS POSSIBLES
- Ajouter des exemples concrets si manquants
- Remplacer le jargon par un langage accessible
- Renforcer les transitions entre slides
- Améliorer la variété des layouts utilisés
- Ajouter des données chiffrées là où c'est pertinent

# FORMAT DE SORTIE
Retourne UNIQUEMENT le Markdown corrigé et amélioré, sans commentaires ni explications.
Conserve EXACTEMENT le même format (séparateurs ---, blocs :::, etc.).`

// Modèles valides
const VALID_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-3-5-haiku-20241022'
]

// Interface pour la palette générée
interface GeneratedPalette {
  accent: string
  accentContrast: string
  accentLight: string
  accentDark: string
  textHighlight: string
}

export default defineEventHandler(async (event) => {
  const { prompt, apiKey, title, model, baseColor } = await readBody(event)

  if (!prompt || !apiKey) {
    throw createError({
      statusCode: 400,
      message: 'Prompt et clé API requis'
    })
  }

  // Valider et utiliser le modèle demandé (fallback sur Sonnet)
  const selectedModel = VALID_MODELS.includes(model) ? model : 'claude-sonnet-4-20250514'
  console.log(`🤖 Modèle utilisé: ${selectedModel}`)

  try {
    const anthropic = new Anthropic({
      apiKey: apiKey
    })

    // Étape 0 : Génération de la palette WCAG
    console.log('🎨 Génération de la palette...')
    let palette: GeneratedPalette | null = null

    if (baseColor) {
      try {
        const paletteResponse = await anthropic.messages.create({
          model: selectedModel,
          max_tokens: 512,
          system: PALETTE_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Couleur d'accent fournie par l'utilisateur : ${baseColor}`
            }
          ]
        })

        const paletteText = paletteResponse.content
          .filter(block => block.type === 'text')
          .map(block => (block as { type: 'text'; text: string }).text)
          .join('')

        // Parser le JSON de la palette
        const jsonMatch = paletteText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          palette = JSON.parse(jsonMatch[0]) as GeneratedPalette
          console.log('✅ Palette générée:', palette)
        }
      } catch (paletteError: any) {
        console.log('⚠️ Erreur génération palette, utilisation fallback:', paletteError.message)
      }
    }

    // Fallback si pas de palette générée
    if (!palette) {
      const base = baseColor || '#0073aa'
      palette = {
        accent: base,
        accentContrast: '#ffffff',
        accentLight: lightenColor(base, 20),
        accentDark: darkenColor(base, 20),
        textHighlight: '#fbbf24' // Jaune par défaut
      }
      console.log('📦 Palette fallback:', palette)
    }

    const userPrompt = title
      ? `Titre de la présentation : "${title}"\n\nContenu source :\n${prompt}`
      : prompt

    // Étape 1 : Recherche et brief structuré
    console.log('🔍 Analyse et brief structuré...')
    const researchResponse = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 2048,
      system: RESEARCH_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    const researchBrief = researchResponse.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n')

    console.log('✅ Brief structuré créé')

    // Étape 2 : Génération initiale (enrichie par le brief)
    console.log('📝 Génération du markdown...')
    const response = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `# BRIEF DE RECHERCHE (contexte pour la génération)\n\n${researchBrief}\n\n# CONTENU SOURCE\n\n${userPrompt}`
        }
      ]
    })

    // Extraire le texte de la réponse
    const initialMarkdown = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n')

    // Étape 3 : Relecture et amélioration
    console.log('🔍 Relecture du markdown...')
    const reviewResponse = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 8192,
      system: REVIEW_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Voici la présentation à relire et améliorer :\n\n${initialMarkdown}`
        }
      ]
    })

    const markdown = reviewResponse.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n')

    // Parser les slides
    const slides = parseSlides(markdown)

    return {
      markdown,
      slides,
      palette
    }

  } catch (error: any) {
    console.error('Erreur Claude API:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Erreur lors de la génération'
    })
  }
})

/**
 * Éclaircit une couleur hex
 */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, (num >> 16) + amt)
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt)
  const B = Math.min(255, (num & 0x0000FF) + amt)
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}

/**
 * Assombrit une couleur hex
 */
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, (num >> 16) - amt)
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt)
  const B = Math.max(0, (num & 0x0000FF) - amt)
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}

function parseSlides(markdown: string): Slide[] {
  const slideTexts = markdown.split(/\n---\n/).filter(s => s.trim())

  return slideTexts.map(text => {
    const lines = text.trim().split('\n')
    const titleMatch = lines[0]?.match(/^#\s+(.+)/)
    const title = titleMatch ? titleMatch[1] : 'Sans titre'

    const content = lines.slice(1).join('\n').trim()
    const preview = content.slice(0, 100) + (content.length > 100 ? '...' : '')

    return {
      title,
      content,
      preview
    }
  })
}
