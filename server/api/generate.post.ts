import Anthropic from '@anthropic-ai/sdk'
import type { Slide } from '~/types'
import { PALETTE_PROMPT, RESEARCH_PROMPT, SYSTEM_PROMPT, REVIEW_PROMPT } from '../utils/prompts'

// Modèles valides
const VALID_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-3-5-haiku-20241022'
]

// Interface pour la palette générée
interface GeneratedPalette {
  accent: string
  accentContrast: string
  accentLight: string
  accentDark: string
  textHighlight: string
}

type Step = 'palette' | 'research' | 'generate' | 'review'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { step, apiKey, model } = body as { step: Step; apiKey: string; model?: string }

  if (!step || !apiKey) {
    throw createError({
      statusCode: 400,
      message: 'Step et clé API requis'
    })
  }

  const selectedModel = VALID_MODELS.includes(model) ? model : 'claude-sonnet-4-20250514'

  try {
    const anthropic = new Anthropic({ apiKey })

    switch (step) {
      case 'palette':
        return await handlePalette(anthropic, selectedModel, body)
      case 'research':
        return await handleResearch(anthropic, selectedModel, body)
      case 'generate':
        return await handleGenerate(anthropic, selectedModel, body)
      case 'review':
        return await handleReview(anthropic, selectedModel, body)
      default:
        throw createError({ statusCode: 400, message: `Step invalide: ${step}` })
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error(`Erreur step ${step}:`, error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Erreur lors de la génération'
    })
  }
})

// ─── STEP 1: PALETTE ───────────────────────────────────

async function handlePalette(
  anthropic: InstanceType<typeof Anthropic>,
  model: string,
  body: any
): Promise<{ palette: GeneratedPalette }> {
  const { baseColor } = body

  if (baseColor) {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 512,
        system: PALETTE_PROMPT,
        messages: [{ role: 'user', content: `Couleur d'accent fournie par l'utilisateur : ${baseColor}` }]
      })

      const text = extractText(response)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const palette = JSON.parse(jsonMatch[0]) as GeneratedPalette
        console.log('✅ Palette générée:', palette)
        return { palette }
      }
    } catch (e: any) {
      console.log('⚠️ Palette fallback:', e.message)
    }
  }

  // Fallback
  const base = baseColor || '#0073aa'
  return {
    palette: {
      accent: base,
      accentContrast: '#ffffff',
      accentLight: lightenColor(base, 20),
      accentDark: darkenColor(base, 20),
      textHighlight: '#fbbf24'
    }
  }
}

// ─── STEP 2: RESEARCH ──────────────────────────────────

async function handleResearch(
  anthropic: InstanceType<typeof Anthropic>,
  model: string,
  body: any
): Promise<{ brief: string }> {
  const { prompt, title } = body

  if (!prompt) {
    throw createError({ statusCode: 400, message: 'Prompt requis' })
  }

  const userPrompt = title
    ? `Titre de la présentation : "${title}"\n\nContenu source :\n${prompt}`
    : prompt

  console.log('🔍 Analyse et brief structuré...')
  const response = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    system: RESEARCH_PROMPT,
    messages: [{ role: 'user', content: userPrompt }]
  })

  const brief = extractText(response)
  console.log('✅ Brief structuré créé')

  return { brief }
}

// ─── STEP 3: GENERATE ──────────────────────────────────

async function handleGenerate(
  anthropic: InstanceType<typeof Anthropic>,
  model: string,
  body: any
): Promise<{ markdown: string; slides: Slide[] }> {
  const { prompt, title, brief } = body

  if (!prompt) {
    throw createError({ statusCode: 400, message: 'Prompt requis' })
  }

  const userPrompt = title
    ? `Titre de la présentation : "${title}"\n\nContenu source :\n${prompt}`
    : prompt

  const content = brief
    ? `# BRIEF DE RECHERCHE (contexte pour la génération)\n\n${brief}\n\n# CONTENU SOURCE\n\n${userPrompt}`
    : userPrompt

  console.log('📝 Génération du markdown...')
  const response = await anthropic.messages.create({
    model,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }]
  })

  const markdown = extractText(response)
  const slides = parseSlides(markdown)

  return { markdown, slides }
}

// ─── STEP 4: REVIEW ────────────────────────────────────

async function handleReview(
  anthropic: InstanceType<typeof Anthropic>,
  model: string,
  body: any
): Promise<{ markdown: string; slides: Slide[] }> {
  const { markdown: inputMarkdown } = body

  if (!inputMarkdown) {
    throw createError({ statusCode: 400, message: 'Markdown requis' })
  }

  console.log('🔍 Relecture du markdown...')
  const response = await anthropic.messages.create({
    model,
    max_tokens: 8192,
    system: REVIEW_PROMPT,
    messages: [{ role: 'user', content: `Voici la présentation à relire et améliorer :\n\n${inputMarkdown}` }]
  })

  const markdown = extractText(response)
  const slides = parseSlides(markdown)

  return { markdown, slides }
}

// ─── HELPERS ────────────────────────────────────────────

function extractText(response: any): string {
  return response.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n')
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, (num >> 16) + amt)
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt)
  const B = Math.min(255, (num & 0x0000FF) + amt)
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, (num >> 16) - amt)
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt)
  const B = Math.max(0, (num & 0x0000FF) - amt)
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}

function parseSlides(markdown: string): Slide[] {
  const slideTexts = markdown.split(/\n---\n/).filter(s => s.trim())

  return slideTexts.map(text => {
    const lines = text.trim().split('\n')
    const titleMatch = lines[0]?.match(/^#\s+(.+)/)
    const title = titleMatch ? titleMatch[1] : 'Sans titre'

    const content = lines.slice(1).join('\n').trim()
    const preview = content.slice(0, 100) + (content.length > 100 ? '...' : '')

    return { title, content, preview }
  })
}
