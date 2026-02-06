import { renderPresentation } from '../utils/template'
import type { Slide } from '~/types'

interface GeneratedPalette {
  accent: string
  accentContrast: string
  accentLight: string
  accentDark: string
  textHighlight: string
}

export default defineEventHandler(async (event) => {
  const { slide, palette, baseColor, slideIndex } = await readBody<{
    slide: Slide
    palette?: GeneratedPalette | null
    baseColor?: string
    slideIndex?: number
  }>(event)

  if (!slide) {
    throw createError({
      statusCode: 400,
      message: 'Slide requise'
    })
  }

  try {
    // Générer le HTML pour un seul slide (mode preview : sans footer/navigation)
    // slideStartIndex permet de rendre le slide avec son style correct (hero vs content)
    const html = renderPresentation({
      title: slide.title,
      slides: [slide],
      baseColor: baseColor || '#0073aa',
      mode: 'dark',
      palette: palette || undefined,
      previewMode: true,
      slideStartIndex: slideIndex || 0
    })

    return { html }
  } catch (error: any) {
    console.error('Erreur preview slide:', error)
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la génération de l\'aperçu'
    })
  }
})
