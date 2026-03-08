import Anthropic from '@anthropic-ai/sdk'
import { storageReadMetadata } from '../utils/storage'
import type { Slide } from '~/types'

const IMPROVE_PROMPT = `Tu es un expert en amélioration de présentations pédagogiques au format Markdown PREZ.

# TA MISSION
Modifier le Markdown de la présentation selon les instructions de l'utilisateur.

# FILTRE QUALITÉ (APPLIQUER À CHAQUE SLIDE)
1. **"Est-ce que je dirais ça à voix haute ?"** — Le texte doit sonner naturel, comme un enseignant qui parle à sa classe
2. **"Est-ce que cette slide mérite sa place ?"** — Chaque slide doit apporter une valeur unique avec des données concrètes

# FORMAT MARKDOWN PREZ (OBLIGATOIRE)

## Titres
- Format : \`# Mot1 **mot-clé** mot3\`
- Un seul mot en **gras** pour la mise en valeur (couleur accent)
- JAMAIS de HTML (<span>, <img>, etc.) - utiliser **gras** pour colorier

## Blocs spéciaux disponibles
- \`:::intro\` — Introduction avec citation
- \`:::cards\` — Grille de cartes \`[Titre|couleur]\`
- \`:::compare\` — Barres comparatives
- \`:::steps\` — Étapes numérotées
- \`:::points\` — Points avec icônes
- \`:::tip\` — Conseil
- \`:::sidebar Titre\` — Panneau latéral

## Couleurs cartes
\`[TITRE|couleur]\` où couleur = yellow, blue, green, red, purple, orange, accent

## Symboles
- ✓ positif, ✗ négatif, → action, 💡 astuce, ⚠ attention

# RÈGLES CRITIQUES

1. **JAMAIS de HTML** : Pas de <span>, <img>, <div>, style=, etc.
2. **Mise en valeur** : Utiliser **gras** uniquement
3. **Séparateur slides** : \`---\` (3 tirets seuls sur une ligne)
4. Conserve la structure existante sauf demande explicite
5. Applique UNIQUEMENT les modifications demandées
6. **Langage naturel** : Reformuler les phrases qui sonnent artificielles
7. **Données concrètes** : Ajouter des chiffres/exemples réels si pertinent

# CONTRAINTES DE DENSITÉ
- Max 4 cartes, 3 compare, 5 steps, 4 points par slide

# FORMAT DE SORTIE
Retourne UNIQUEMENT le Markdown modifié, sans explication.
Commence directement par le titre de la première slide (# Titre).`

// Interface pour la palette
interface GeneratedPalette {
  accent: string
  accentContrast: string
  accentLight: string
  accentDark: string
  textHighlight: string
}

// Interface metadata
interface PresentationMetadata {
  title: string
  markdown: string
  baseColor: string
  palette: GeneratedPalette | null
  model: string
  createdAt: string
}

export default defineEventHandler(async (event) => {
  const { filename, instructions, apiKey, model } = await readBody<{
    filename: string
    instructions: string
    apiKey: string
    model?: string
  }>(event)

  if (!filename || !instructions || !apiKey) {
    throw createError({
      statusCode: 400,
      message: 'Filename, instructions et clé API requis'
    })
  }

  try {
    // Lire les metadata de la présentation
    const metadata = await storageReadMetadata(filename) as PresentationMetadata | null
    if (!metadata) {
      throw createError({
        statusCode: 404,
        message: 'Metadata non trouvée pour cette présentation. Régénérez-la d\'abord.'
      })
    }

    if (!metadata.markdown) {
      throw createError({
        statusCode: 400,
        message: 'Markdown source non disponible pour cette présentation.'
      })
    }

    console.log('📝 Amélioration de la présentation...')
    console.log(`Instructions: ${instructions}`)

    const anthropic = new Anthropic({ apiKey })
    const selectedModel = model || metadata.model || 'claude-sonnet-4-20250514'

    // Demander à l'IA de modifier le Markdown
    const response = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 8192,
      system: IMPROVE_PROMPT,
      messages: [
        {
          role: 'user',
          content: `# Présentation actuelle (Markdown)\n\n${metadata.markdown}\n\n# Instructions de modification\n\n${instructions}`
        }
      ]
    })

    const improvedMarkdown = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n')

    // Parser les nouvelles slides
    const slides = parseSlides(improvedMarkdown)

    console.log(`✅ Markdown modifié (${slides.length} slides)`)

    return {
      markdown: improvedMarkdown,
      slides,
      palette: metadata.palette,
      baseColor: metadata.baseColor,
      title: metadata.title,
      model: selectedModel
    }

  } catch (error: any) {
    console.error('Erreur amélioration:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Erreur lors de l\'amélioration'
    })
  }
})

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
