import { storageRead, storageReadMetadata } from '../../utils/storage'
import type { Slide } from '~/types'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')

  if (!filename) {
    throw createError({
      statusCode: 400,
      message: 'Filename requis'
    })
  }

  // Lire le HTML
  const html = await storageRead(filename)
  if (!html) {
    throw createError({
      statusCode: 404,
      message: 'Présentation non trouvée'
    })
  }

  // Lire les metadata
  const metadata = await storageReadMetadata(filename)
  if (!metadata) {
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
