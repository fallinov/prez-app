import Anthropic from '@anthropic-ai/sdk'
import { renderPresentation } from '../utils/template'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import type { Slide } from '~/types'

const HTML_REVIEW_PROMPT = `Tu es un expert en HTML/CSS, UX et accessibilité pour présentations pédagogiques.

# VÉRIFICATIONS TECHNIQUES
1. **Balises HTML** : bien formées, fermées, attributs échappés
2. **Texte brut** : pas de code HTML visible comme texte
3. **Classes CSS** : complètes et valides

# VÉRIFICATIONS UX/ACCESSIBILITÉ
4. **Contrastes** : texte lisible sur fond (text-slate-300 minimum sur bg-slate-800/900)
5. **Attributs alt** : présents et descriptifs sur toutes les images
6. **Hiérarchie titres** : h1 > h2 > h3 logique
7. **Liens** : attribut target="_blank" avec texte explicite
8. **Lisibilité** : pas de texte trop petit (min text-sm), pas trop de contenu par slide

# CORRECTIONS À FAIRE
- Remplacer text-slate-400/500 par text-slate-300 si sur fond sombre
- Ajouter alt manquants aux images
- Corriger les balises mal formées
- Supprimer le contenu dupliqué

RÈGLES :
- Retourne UNIQUEMENT le HTML corrigé complet
- Si tout est correct, retourne le HTML tel quel
- Ne modifie JAMAIS le contenu textuel, seulement les problèmes techniques
- Conserve toute la structure, les classes et les styles`

export default defineEventHandler(async (event) => {
  const { slides, baseColor, title, apiKey, model } = await readBody<{
    slides: Slide[]
    baseColor: string
    title: string
    markdown?: string
    apiKey?: string
    model?: string
  }>(event)

  if (!slides || !slides.length) {
    throw createError({
      statusCode: 400,
      message: 'Slides requises'
    })
  }

  try {
    let html = renderPresentation({
      title: title || 'Présentation',
      slides,
      baseColor: baseColor || '#0073aa',
      mode: 'dark'
    })

    // Étape 3 : Revue HTML par l'IA (si clé API fournie)
    if (apiKey) {
      console.log('🔍 Revue HTML en cours...')
      const anthropic = new Anthropic({ apiKey })

      // Utiliser Haiku pour la revue (rapide et économique)
      const reviewResponse = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 16384,
        system: HTML_REVIEW_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Vérifie et corrige ce HTML si nécessaire :\n\n${html}`
          }
        ]
      })

      const reviewedHtml = reviewResponse.content
        .filter(block => block.type === 'text')
        .map(block => (block as { type: 'text'; text: string }).text)
        .join('\n')

      // Utiliser le HTML corrigé seulement s'il est valide (commence par <!DOCTYPE)
      if (reviewedHtml.trim().startsWith('<!DOCTYPE')) {
        html = reviewedHtml
        console.log('✅ HTML corrigé par l\'IA')
      } else {
        console.log('⚠️ HTML non modifié (réponse IA invalide)')
      }
    }

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
