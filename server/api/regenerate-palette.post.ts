import Anthropic from '@anthropic-ai/sdk'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { renderPresentation } from '../utils/template'
import type { Slide } from '~/types'

const PALETTE_PROMPT = `Tu es un expert en design système et accessibilité WCAG.

# TA MISSION
Générer une palette de 5 couleurs WCAG AAA à partir d'une couleur de base.

# RÈGLES CRITIQUES
1. **accent** : La couleur principale (proche de la couleur de base fournie)
2. **accentContrast** : Couleur de texte sur fond accent (ratio ≥ 7:1 WCAG AAA)
3. **accentLight** : Version plus claire de l'accent (pour highlights)
4. **accentDark** : Version plus foncée de l'accent (pour bordures/ombres)
5. **textHighlight** : Couleur vive pour mettre en valeur du texte sur fond sombre (#1e293b)
   - DOIT avoir un ratio ≥ 7:1 avec #1e293b
   - Évite les couleurs trop proches de l'accent
   - Privilégie : jaune doré, orange, cyan, vert lime

# FORMAT DE SORTIE
Retourne UNIQUEMENT un JSON valide, sans markdown, sans explication :
{"accent":"#...","accentContrast":"#...","accentLight":"#...","accentDark":"#...","textHighlight":"#..."}`

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
  const { filename, baseColor, apiKey } = await readBody<{
    filename: string
    baseColor: string
    apiKey: string
  }>(event)

  if (!filename || !baseColor || !apiKey) {
    throw createError({
      statusCode: 400,
      message: 'Filename, baseColor et clé API requis'
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

    console.log('🎨 Régénération de la palette...')

    const anthropic = new Anthropic({ apiKey })

    // Générer la nouvelle palette avec Haiku (rapide et économique)
    const paletteResponse = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 256,
      system: PALETTE_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Génère une palette WCAG AAA pour la couleur de base : ${baseColor}`
        }
      ]
    })

    const paletteText = paletteResponse.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('')

    let palette: GeneratedPalette
    try {
      palette = JSON.parse(paletteText.trim())
      console.log('✅ Palette générée:', palette)
    } catch {
      throw createError({
        statusCode: 500,
        message: 'Erreur parsing palette JSON'
      })
    }

    // Parser les slides
    const slides = parseSlides(metadata.markdown)

    // Re-render le HTML avec la nouvelle palette
    const html = renderPresentation({
      title: metadata.title,
      slides,
      baseColor: metadata.baseColor,
      mode: 'dark',
      palette
    })

    // Sauvegarder le nouveau HTML et les metadata
    try {
      const htmlPath = join(publicDir, filename)
      await writeFile(htmlPath, html, 'utf-8')

      metadata.palette = palette
      metadata.baseColor = baseColor
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')

      console.log('✅ Palette régénérée et sauvegardée')
    } catch (fsError: any) {
      console.log('⚠️ Sauvegarde fichier impossible (read-only FS):', fsError.message)
    }

    return {
      palette,
      html
    }

  } catch (error: any) {
    console.error('Erreur régénération palette:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Erreur lors de la régénération de la palette'
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
