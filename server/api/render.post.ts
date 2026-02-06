import Anthropic from '@anthropic-ai/sdk'
import { renderPresentation } from '../utils/template'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import type { Slide } from '~/types'

const HTML_REVIEW_PROMPT = `Tu es un expert en HTML/CSS, UX et accessibilité pour présentations pédagogiques projetées en salle de classe.

# CONTEXTE
Ces présentations sont affichées sur vidéoprojecteur dans des salles éclairées. La lisibilité est CRITIQUE.
**Chaque slide = 100vh (hauteur écran). Le contenu NE DOIT PAS dépasser !**

# VÉRIFICATIONS TECHNIQUES
1. **Balises HTML** : bien formées, fermées correctement
2. **Attributs** : correctement échappés (guillemets, &, <, >)
3. **Pas de code visible** : aucun texte ressemblant à du HTML/code non voulu

# VÉRIFICATIONS CONTRASTES (CRITIQUE)
4. **Texte sur fond sombre** : MINIMUM text-slate-300 (jamais text-slate-400/500/600)
5. **Titres** : text-white ou text-accent uniquement
6. **Sous-textes** : text-slate-300 minimum
7. **Labels/hints** : si text-slate-400, changer en text-slate-300

# VÉRIFICATIONS DENSITÉ (CRITIQUE - 100vh max)
8. **Si slide semble dense** (beaucoup d'éléments) : RÉDUIRE les espacements
   - mb-8 → mb-4
   - mb-6 → mb-3
   - space-y-4 → space-y-2
   - space-y-3 → space-y-2
   - gap-4 → gap-2
   - p-6 → p-4
   - p-5 → p-4
   - p-4 → p-3
9. **Padding du wrapper** : si dense, réduire slide-content-wrapper padding

# VÉRIFICATIONS TYPOGRAPHIE
10. **Taille minimum** : text-sm (14px), jamais text-xs pour du contenu principal
11. **Hiérarchie** : h1 > h2 > h3, cohérent

# VÉRIFICATIONS STRUCTURE
12. **Liens** : target="_blank" présent, texte explicite

# VÉRIFICATIONS ACCESSIBILITÉ
13. **Images** : attribut alt présent et descriptif

# CORRECTIONS À APPLIQUER
- text-slate-400 → text-slate-300
- text-slate-500 → text-slate-300
- text-slate-600 → text-slate-400
- Ajouter target="_blank" aux liens externes
- **RÉDUIRE les marges si slide dense**

# RÈGLES STRICTES
- Retourne UNIQUEMENT le HTML corrigé complet (commence par <!DOCTYPE)
- Ne modifie JAMAIS le contenu textuel
- Réduis les espacements si tu détectes une slide dense
- Si tout est correct, retourne le HTML identique`

// Interface pour la palette générée par l'IA
interface GeneratedPalette {
  accent: string
  accentContrast: string
  accentLight: string
  accentDark: string
  textHighlight: string
}

// Metadata sauvegardée avec chaque présentation
interface PresentationMetadata {
  title: string
  markdown: string
  baseColor: string
  palette: GeneratedPalette | null
  model: string
  createdAt: string
}

export default defineEventHandler(async (event) => {
  const { slides, baseColor, title, apiKey, palette, markdown, model } = await readBody<{
    slides: Slide[]
    baseColor: string
    title: string
    markdown?: string
    apiKey?: string
    palette?: GeneratedPalette
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
      mode: 'dark',
      palette: palette || undefined
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

    // Sauvegarder les metadata JSON (pour modifications futures)
    const metadataFilename = filename.replace('.html', '.json')
    const metadata: PresentationMetadata = {
      title: title || 'Présentation',
      markdown: markdown || '',
      baseColor: baseColor || '#0073aa',
      palette: palette || null,
      model: model || 'claude-sonnet-4-20250514',
      createdAt: new Date().toISOString()
    }
    await writeFile(join(publicDir, metadataFilename), JSON.stringify(metadata, null, 2), 'utf-8')

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
