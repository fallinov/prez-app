import Anthropic from '@anthropic-ai/sdk'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { Slide } from '~/types'

const IMPROVE_PROMPT = `Tu es un expert en amélioration de présentations pédagogiques.

# TA MISSION
Modifier le Markdown de la présentation selon les instructions de l'utilisateur.

# RÈGLES
1. Conserve le format Markdown PREZ (blocs :::, séparateurs ---, etc.)
2. Conserve la structure générale sauf si l'utilisateur demande explicitement de la changer
3. Applique UNIQUEMENT les modifications demandées
4. Ne modifie pas le reste de la présentation
5. Retourne le Markdown complet modifié

# CONTRAINTES DE DENSITÉ (CRITIQUE)
- Maximum 4 cartes par slide
- Maximum 3 barres de comparaison
- Maximum 5 étapes numérotées
- Maximum 4 points avec icônes
- Si tu ajoutes du contenu, assure-toi que la slide ne dépasse pas ces limites

# FORMAT DE SORTIE
Retourne UNIQUEMENT le Markdown modifié, sans explication ni commentaire.
Commence directement par le contenu de la première slide (# Titre).`

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
    const publicDir = join(process.cwd(), 'public', 'generated')
    const metadataFilename = filename.replace('.html', '.json')
    const metadataPath = join(publicDir, metadataFilename)

    let metadata: PresentationMetadata
    try {
      const metadataContent = await readFile(metadataPath, 'utf-8')
      metadata = JSON.parse(metadataContent)
    } catch {
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
