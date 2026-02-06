import { renderPresentation } from '../utils/template'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import type { Slide } from '~/types'

export default defineEventHandler(async (event) => {
  const { slides, baseColor, title } = await readBody<{
    slides: Slide[]
    baseColor: string
    title: string
    markdown?: string
  }>(event)

  if (!slides || !slides.length) {
    throw createError({
      statusCode: 400,
      message: 'Slides requises'
    })
  }

  try {
    const html = renderPresentation({
      title: title || 'Présentation',
      slides,
      baseColor: baseColor || '#0073aa',
      mode: 'dark'
    })

    // Sauvegarder dans public/generated/
    const filename = generateFilename(title)
    const publicDir = join(process.cwd(), 'public', 'generated')

    // Créer le dossier si nécessaire
    await mkdir(publicDir, { recursive: true })

    const filepath = join(publicDir, filename)
    await writeFile(filepath, html, 'utf-8')

    const url = `/generated/${filename}`
    console.log(`✅ Présentation sauvegardée: ${url}`)

    return { html, url, filename }
  } catch (error: any) {
    console.error('Erreur rendu:', error)
    throw createError({
      statusCode: 500,
      message: 'Erreur lors du rendu'
    })
  }
})

/**
 * Génère un nom de fichier unique basé sur le titre et la date
 */
function generateFilename(title: string): string {
  const now = new Date()
  // Formater en heure locale (pas UTC)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const date = `${year}-${month}-${day}_${hours}h${minutes}`

  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever accents
    .replace(/[^a-z0-9]+/g, '-')     // Remplacer caractères spéciaux par tirets
    .replace(/^-|-$/g, '')           // Enlever tirets au début/fin
    .slice(0, 50)                    // Limiter la longueur

  return `${date}_${slug}.html`
}
