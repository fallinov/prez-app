import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Anthropic SDK
const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate }
    }
  }
})

// Mock Nuxt server utils
vi.stubGlobal('defineEventHandler', (handler: any) => handler)
vi.stubGlobal('readBody', vi.fn())
vi.stubGlobal('createError', (opts: any) => {
  const err = new Error(opts.message) as any
  err.statusCode = opts.statusCode
  return err
})

const readBody = vi.fn() as any
vi.stubGlobal('readBody', readBody)

// Helper: créer une réponse Claude simulée
function claudeResponse(text: string) {
  return {
    content: [{ type: 'text', text }]
  }
}

// Charger le handler après les mocks
let handler: any
beforeEach(async () => {
  vi.clearAllMocks()
  const mod = await import('../server/api/generate.post')
  handler = mod.default
})

describe('generate.post.ts - step-based API', () => {
  it('rejette si step ou apiKey manquant', async () => {
    const event = {} as any
    readBody.mockResolvedValue({ step: '', apiKey: '' })

    await expect(handler(event)).rejects.toThrow('Step et clé API requis')
  })

  it('rejette un step invalide', async () => {
    const event = {} as any
    readBody.mockResolvedValue({ step: 'invalid', apiKey: 'sk-test' })

    await expect(handler(event)).rejects.toThrow('Step invalide')
  })

  // ─── STEP: PALETTE ──────────────────────────────────

  it('génère une palette depuis une couleur de base', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      step: 'palette',
      apiKey: 'sk-test',
      baseColor: '#3b82f6'
    })

    mockCreate.mockResolvedValueOnce(claudeResponse(
      '{"accent":"#3b82f6","accentContrast":"#ffffff","accentLight":"#60a5fa","accentDark":"#2563eb","textHighlight":"#fbbf24"}'
    ))

    const result = await handler(event)

    expect(result.palette.accent).toBe('#3b82f6')
    expect(result.palette.accentContrast).toBe('#ffffff')
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('retourne une palette fallback si la génération échoue', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      step: 'palette',
      apiKey: 'sk-test',
      baseColor: '#ff0000'
    })

    mockCreate.mockRejectedValueOnce(new Error('API error'))

    const result = await handler(event)

    expect(result.palette.accent).toBe('#ff0000')
    expect(result.palette.accentContrast).toBe('#ffffff')
    expect(result.palette.textHighlight).toBe('#fbbf24')
  })

  it('retourne une palette fallback par défaut si pas de baseColor', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      step: 'palette',
      apiKey: 'sk-test'
    })

    const result = await handler(event)

    expect(mockCreate).not.toHaveBeenCalled()
    expect(result.palette.accent).toBe('#0073aa')
  })

  // ─── STEP: RESEARCH ─────────────────────────────────

  it('génère un brief structuré', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      step: 'research',
      apiKey: 'sk-test',
      prompt: 'Les bases du HTML',
      title: 'HTML pour débutants'
    })

    mockCreate.mockResolvedValueOnce(claudeResponse('BRIEF:\n- Sujet: HTML\nPLAN:\n1. Titre'))

    const result = await handler(event)

    expect(result.brief).toContain('BRIEF')
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('rejette research sans prompt', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      step: 'research',
      apiKey: 'sk-test'
    })

    await expect(handler(event)).rejects.toThrow('Prompt requis')
  })

  // ─── STEP: GENERATE ─────────────────────────────────

  it('génère le markdown avec brief', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      step: 'generate',
      apiKey: 'sk-test',
      prompt: 'Les bases du HTML',
      title: 'HTML',
      brief: 'BRIEF: HTML basics'
    })

    const markdown = '# HTML pour **débutants**\n\nIntro\n\n---\n\n# Les **balises**\n\nContenu'
    mockCreate.mockResolvedValueOnce(claudeResponse(markdown))

    const result = await handler(event)

    expect(result.markdown).toContain('HTML')
    expect(result.slides).toHaveLength(2)
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  // ─── STEP: REVIEW ───────────────────────────────────

  it('relit et améliore le markdown', async () => {
    const event = {} as any
    const markdown = '# Slide **1**\n\nIntro\n\n---\n\n# Les **bases**\n\nContenu'
    readBody.mockResolvedValue({
      step: 'review',
      apiKey: 'sk-test',
      markdown
    })

    const reviewed = '# Slide **1**\n\nIntro améliorée\n\n---\n\n# Les **bases**\n\nContenu enrichi'
    mockCreate.mockResolvedValueOnce(claudeResponse(reviewed))

    const result = await handler(event)

    expect(result.markdown).toContain('améliorée')
    expect(result.slides).toHaveLength(2)
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('rejette review sans markdown', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      step: 'review',
      apiKey: 'sk-test'
    })

    await expect(handler(event)).rejects.toThrow('Markdown requis')
  })

  // ─── VALIDATION MODÈLE ──────────────────────────────

  it('valide le modèle et utilise Sonnet par défaut', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      step: 'research',
      apiKey: 'sk-test',
      prompt: 'Test',
      model: 'gpt-4-invalid'
    })

    mockCreate.mockResolvedValueOnce(claudeResponse('BRIEF'))

    await handler(event)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-4-20250514' })
    )
  })

  it('propage les erreurs API Claude', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      step: 'research',
      apiKey: 'sk-invalid',
      prompt: 'Test'
    })

    mockCreate.mockRejectedValue(new Error('Invalid API key'))

    await expect(handler(event)).rejects.toThrow('Invalid API key')
  })
})
