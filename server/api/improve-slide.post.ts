import Anthropic from '@anthropic-ai/sdk'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { renderPresentation } from '../utils/template'
import type { Slide } from '~/types'

const SLIDE_IMPROVE_PROMPT = `Tu modifies UN SEUL slide d'une présentation pédagogique au format Markdown PREZ.

# TA MISSION
Modifier le contenu du slide selon les instructions de l'utilisateur.

# FORMAT MARKDOWN PREZ (OBLIGATOIRE)

## Titre
- Format : \`# Mot1 **mot-clé** mot3\`
- Un seul mot en **gras** pour la mise en valeur (accent color)
- JAMAIS de HTML (<span>, etc.) - utiliser **gras** pour colorier

## Blocs spéciaux
\`\`\`
:::intro
"Citation ou accroche"
Texte d'introduction.
:::

:::cards
[Titre1|yellow] Description courte
✓ Point positif
✗ Point négatif

[Titre2|blue] Description
✓ Avantage
:::

:::compare
Label 1|valeur1|pourcentage|red
Label 2|valeur2|pourcentage|green
:::

:::steps
1. **Étape** — Description
2. **Étape** — Description
:::

:::points
🎯 **Titre** — Description du point
💡 **Titre** — Description du point
:::

:::tip
Conseil ou astuce importante
:::

:::sidebar Titre
- Item 1
- Item 2
:::
\`\`\`

## Couleurs cartes
\`[TITRE|couleur]\` où couleur = yellow, blue, green, red, purple, orange, accent

## Symboles
- ✓ = positif (vert)
- ✗ = négatif (rouge)
- → = action
- 💡 = astuce
- ⚠ = attention

## Images/Logos
Pour un logo, utiliser un tag entre crochets : \`[Logo WordPress]\`
NE PAS utiliser de balises HTML ou d'URLs d'images.

# RÈGLES CRITIQUES

1. **JAMAIS de HTML** : Pas de <span>, <img>, <div>, etc.
2. **Mise en valeur** : Utiliser **gras** (pas de style inline)
3. **Conserve la structure** : Garder les blocs ::: existants si pertinents
4. **Densité** : Max 4 cartes, 3 compare, 5 steps, 4 points

# FORMAT DE SORTIE

Retourne UNIQUEMENT le contenu Markdown du slide modifié.
Commence par le titre (# Titre du slide).
Pas d'explication, pas de bloc de code markdown autour.`

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
  const { filename, slideIndex, instructions, apiKey, model } = await readBody<{
    filename: string
    slideIndex: number
    instructions: string
    apiKey: string
    model?: string
  }>(event)

  if (!filename || slideIndex === undefined || !instructions || !apiKey) {
    throw createError({
      statusCode: 400,
      message: 'Filename, slideIndex, instructions et clé API requis'
    })
  }

  try {
    const publicDir = join(process.cwd(), 'public', 'generated')

    // Lire les metadata
    const metadataFilename = filename.replace('.html', '.json')
    const metadataPath = join(publicDir, metadataFilename)

    let metadata: PresentationMetadata
    try {
      const metadataContent = await readFile(metadataPath, 'utf-8')
      metadata = JSON.parse(metadataContent)
    } catch {
      throw createError({
        statusCode: 404,
        message: 'Metadata non trouvée pour cette présentation.'
      })
    }

    if (!metadata.markdown) {
      throw createError({
        statusCode: 400,
        message: 'Markdown source non disponible.'
      })
    }

    // Parser les slides
    const slideTexts = metadata.markdown.split(/\n---\n/).filter(s => s.trim())

    if (slideIndex < 0 || slideIndex >= slideTexts.length) {
      throw createError({
        statusCode: 400,
        message: `Index de slide invalide. La présentation a ${slideTexts.length} slides.`
      })
    }

    const currentSlide = slideTexts[slideIndex]
    console.log(`📝 Amélioration du slide ${slideIndex + 1}/${slideTexts.length}...`)
    console.log(`Instructions: ${instructions}`)

    const anthropic = new Anthropic({ apiKey })
    const selectedModel = model || metadata.model || 'claude-sonnet-4-20250514'

    // Demander à l'IA de modifier le slide
    const response = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 4096,
      system: SLIDE_IMPROVE_PROMPT,
      messages: [
        {
          role: 'user',
          content: `# Slide actuel (${slideIndex + 1}/${slideTexts.length})\n\n${currentSlide}\n\n# Instructions de modification\n\n${instructions}`
        }
      ]
    })

    const improvedSlide = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n')
      .trim()

    // Reconstruire le markdown complet
    slideTexts[slideIndex] = improvedSlide
    const newMarkdown = slideTexts.join('\n\n---\n\n')

    // Parser les nouvelles slides
    const slides = parseSlides(newMarkdown)

    // Rendre le HTML
    const html = renderPresentation({
      title: metadata.title,
      slides,
      baseColor: metadata.baseColor,
      mode: 'dark',
      palette: metadata.palette || undefined
    })

    // Sauvegarder le HTML
    const htmlPath = join(publicDir, filename)
    await writeFile(htmlPath, html, 'utf-8')

    // Mettre à jour les metadata
    metadata.markdown = newMarkdown
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')

    console.log(`✅ Slide ${slideIndex + 1} modifié et sauvegardé`)

    return {
      markdown: newMarkdown,
      slides,
      html,
      modifiedSlideIndex: slideIndex
    }

  } catch (error: any) {
    console.error('Erreur amélioration slide:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Erreur lors de l\'amélioration du slide'
    })
  }
})

function parseSlides(markdown: string): Slide[] {
  if (!markdown) return []

  const slideTexts = markdown.split(/\n---\n/).filter(s => s.trim())

  return slideTexts.map((text, index) => {
    const lines = text.trim().split('\n')
    const titleMatch = lines[0]?.match(/^#\s+(.+)/)
    const title = titleMatch?.[1] ?? `Slide ${index + 1}`

    const content = lines.slice(1).join('\n').trim()
    const preview = content.slice(0, 100) + (content.length > 100 ? '...' : '')

    return {
      title,
      content,
      preview
    }
  })
}
