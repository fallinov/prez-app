import { renderPresentation } from '../utils/template'
import { storageReadMetadata, storageWritePresentation } from '../utils/storage'
import type { Slide } from '~/types'

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
  const { filename, palette } = await readBody<{
    filename: string
    palette: GeneratedPalette
  }>(event)

  if (!filename || !palette) {
    throw createError({
      statusCode: 400,
      message: 'Filename et palette requis'
    })
  }

  try {
    // Lire les metadata
    const metadata = await storageReadMetadata(filename) as PresentationMetadata | null
    if (!metadata) {
      throw createError({
        statusCode: 404,
        message: 'Metadata non trouvée pour cette présentation.'
      })
    }

    console.log('🎨 Mise à jour de la palette...')

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

    // Sauvegarder le HTML et les metadata
    metadata.palette = palette
    await storageWritePresentation(filename, html, metadata)
    console.log('✅ Palette mise à jour et sauvegardée')

    return {
      palette,
      html
    }

  } catch (error: any) {
    console.error('Erreur mise à jour palette:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Erreur lors de la mise à jour de la palette'
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
