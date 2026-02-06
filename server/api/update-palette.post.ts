import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { renderPresentation } from '../utils/template'
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

    // Sauvegarder le HTML (même fichier)
    const htmlPath = join(publicDir, filename)
    await writeFile(htmlPath, html, 'utf-8')

    // Mettre à jour les metadata avec la nouvelle palette
    metadata.palette = palette
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')

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
