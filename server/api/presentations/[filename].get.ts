import { readFile } from 'fs/promises'
import { join } from 'path'
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
  const filename = getRouterParam(event, 'filename')

  if (!filename) {
    throw createError({
      statusCode: 400,
      message: 'Filename requis'
    })
  }

  try {
    const publicDir = join(process.cwd(), 'public', 'generated')

    // Lire le HTML
    const htmlPath = join(publicDir, filename)
    const html = await readFile(htmlPath, 'utf-8')

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
        message: 'Metadata non trouvée. Régénérez la présentation.'
      })
    }

    // Parser les slides depuis le markdown
    const slides = parseSlides(metadata.markdown)

    return {
      metadata,
      html,
      slides
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Erreur chargement présentation:', error)
    throw createError({
      statusCode: 404,
      message: 'Présentation non trouvée'
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
