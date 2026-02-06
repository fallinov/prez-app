import Anthropic from '@anthropic-ai/sdk'
import { renderPresentation } from '../utils/template'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import type { Slide } from '~/types'

const VISUAL_REVIEW_PROMPT = `Tu es un expert UX/UI qui analyse visuellement des présentations pédagogiques.

Analyse ce screenshot et identifie les problèmes visuels :

# VÉRIFICATIONS VISUELLES
1. **Lisibilité** : Le texte est-il facilement lisible ? Taille suffisante ?
2. **Contrastes** : Les couleurs offrent-elles un bon contraste ?
3. **Hiérarchie visuelle** : Les titres se distinguent-ils du contenu ?
4. **Équilibre** : La slide est-elle bien équilibrée ou surchargée ?
5. **Espacements** : Y a-t-il assez d'espace entre les éléments ?
6. **Alignements** : Les éléments sont-ils bien alignés ?
7. **Cohérence** : Le style est-il cohérent ?

# FORMAT DE RÉPONSE
Retourne un JSON avec cette structure :
{
  "score": 8,  // Score sur 10
  "issues": [
    { "type": "contrast", "severity": "warning", "message": "Le texte gris clair manque de contraste" },
    { "type": "spacing", "severity": "info", "message": "Espacement un peu serré entre les cartes" }
  ],
  "summary": "Bonne présentation globalement, quelques ajustements mineurs recommandés."
}

Severities: "error" (critique), "warning" (important), "info" (suggestion)
Types: "contrast", "spacing", "alignment", "hierarchy", "readability", "balance", "consistency"`

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

// Configuration htmlcsstoimage.com (optionnel)
const HCTI_USER_ID = process.env.HCTI_USER_ID
const HCTI_API_KEY = process.env.HCTI_API_KEY

interface VisualReviewResult {
  score: number
  issues: Array<{
    type: string
    severity: 'error' | 'warning' | 'info'
    message: string
  }>
  summary: string
  screenshotUrl?: string
}

export default defineEventHandler(async (event) => {
  const { slides, baseColor, title, apiKey, model, enableVisualReview } = await readBody<{
    slides: Slide[]
    baseColor: string
    title: string
    markdown?: string
    apiKey?: string
    model?: string
    enableVisualReview?: boolean
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
      try {
        console.log('🔍 Revue HTML en cours...')
        const anthropic = new Anthropic({ apiKey })

        // Utiliser Haiku pour la revue (rapide et économique)
        const reviewResponse = await anthropic.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 8192,
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
          console.log('⚠️ HTML non modifié (réponse IA invalide ou tronquée)')
        }
      } catch (reviewError: any) {
        console.log('⚠️ Revue HTML ignorée:', reviewError.message || 'Erreur inconnue')
        // On continue avec le HTML original
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

    // Étape 4 : Revue visuelle (si activée et configurée)
    let visualReview: VisualReviewResult | null = null
    if (enableVisualReview && apiKey && HCTI_USER_ID && HCTI_API_KEY) {
      try {
        console.log('📸 Capture screenshot en cours...')

        // Générer un screenshot via htmlcsstoimage.com
        const screenshotResponse = await fetch('https://hcti.io/v1/image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(`${HCTI_USER_ID}:${HCTI_API_KEY}`).toString('base64')
          },
          body: JSON.stringify({
            html: html,
            css: '',
            viewport_width: 1280,
            viewport_height: 720
          })
        })

        if (screenshotResponse.ok) {
          const { url: screenshotUrl } = await screenshotResponse.json() as { url: string }
          console.log(`📸 Screenshot généré: ${screenshotUrl}`)

          // Télécharger l'image pour l'envoyer à Claude
          const imageResponse = await fetch(screenshotUrl)
          const imageBuffer = await imageResponse.arrayBuffer()
          const base64Image = Buffer.from(imageBuffer).toString('base64')

          console.log('🔍 Analyse visuelle en cours...')
          const anthropic = new Anthropic({ apiKey })

          const reviewResponse = await anthropic.messages.create({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 2048,
            system: VISUAL_REVIEW_PROMPT,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: 'image/png',
                      data: base64Image
                    }
                  },
                  {
                    type: 'text',
                    text: 'Analyse cette slide de présentation et retourne le JSON demandé.'
                  }
                ]
              }
            ]
          })

          const reviewText = reviewResponse.content
            .filter(block => block.type === 'text')
            .map(block => (block as { type: 'text'; text: string }).text)
            .join('')

          // Parser le JSON de la réponse
          const jsonMatch = reviewText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            visualReview = JSON.parse(jsonMatch[0]) as VisualReviewResult
            visualReview.screenshotUrl = screenshotUrl
            console.log(`✅ Revue visuelle: Score ${visualReview.score}/10`)
          }
        } else {
          console.log('⚠️ Échec capture screenshot:', await screenshotResponse.text())
        }
      } catch (visualError: any) {
        console.log('⚠️ Revue visuelle ignorée:', visualError.message || 'Erreur inconnue')
      }
    }

    return { html, url, filename, visualReview }
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
