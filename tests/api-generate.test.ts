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

describe('generate.post.ts', () => {
  it('rejette si prompt ou apiKey manquant', async () => {
    const event = {} as any
    readBody.mockResolvedValue({ prompt: '', apiKey: '' })

    await expect(handler(event)).rejects.toThrow('Prompt et clé API requis')
  })

  it('exécute le pipeline complet (palette → research → generate → review)', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      prompt: 'Les bases du HTML',
      apiKey: 'sk-test-123',
      title: 'HTML pour débutants',
      model: 'claude-sonnet-4-20250514',
      baseColor: '#3b82f6'
    })

    // 4 appels Claude : palette, research, generation, review
    mockCreate
      .mockResolvedValueOnce(claudeResponse('{"accent":"#3b82f6","accentContrast":"#ffffff","accentLight":"#60a5fa","accentDark":"#2563eb","textHighlight":"#fbbf24"}'))
      .mockResolvedValueOnce(claudeResponse('BRIEF:\n- Sujet: HTML\nPLAN:\n1. Titre\n2. Balises'))
      .mockResolvedValueOnce(claudeResponse('# HTML pour **débutants**\n\nLes bases du web\n\n[HTML] [Web]\n\n---\n\n# Les **balises** essentielles\n\n:::cards\n[<h1>|blue] Titres\n✓ Structure le contenu\n\n[<p>|green] Paragraphes\n✓ Texte courant\n:::'))
      .mockResolvedValueOnce(claudeResponse('# HTML pour **débutants**\n\nLes bases du web\n\n[HTML] [Web]\n\n---\n\n# Les **balises** essentielles\n\n:::cards\n[<h1>|blue] Titres\n✓ Structure le contenu\n\n[<p>|green] Paragraphes\n✓ Texte courant\n:::'))

    const result = await handler(event)

    // Vérifie que 4 appels Claude ont été faits
    expect(mockCreate).toHaveBeenCalledTimes(4)

    // Vérifie la structure du résultat
    expect(result).toHaveProperty('markdown')
    expect(result).toHaveProperty('slides')
    expect(result).toHaveProperty('palette')
    expect(result.slides).toHaveLength(2)
    expect(result.slides[0].title).toContain('HTML')
    expect(result.palette.accent).toBe('#3b82f6')
  })

  it('utilise la palette fallback si la génération échoue', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      prompt: 'Test',
      apiKey: 'sk-test-123',
      baseColor: '#ff0000'
    })

    // Palette échoue, puis research, generate, review
    mockCreate
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce(claudeResponse('BRIEF'))
      .mockResolvedValueOnce(claudeResponse('# Titre\n\nContenu'))
      .mockResolvedValueOnce(claudeResponse('# Titre\n\nContenu'))

    const result = await handler(event)

    expect(result.palette.accent).toBe('#ff0000')
    expect(result.palette.accentContrast).toBe('#ffffff')
    expect(result.palette.textHighlight).toBe('#fbbf24')
  })

  it('utilise la palette fallback par défaut si pas de baseColor', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      prompt: 'Test',
      apiKey: 'sk-test-123'
    })

    // Pas de baseColor = pas d'appel palette, research + generate + review
    mockCreate
      .mockResolvedValueOnce(claudeResponse('BRIEF'))
      .mockResolvedValueOnce(claudeResponse('# Titre\n\nContenu'))
      .mockResolvedValueOnce(claudeResponse('# Titre\n\nContenu'))

    const result = await handler(event)

    // 3 appels seulement (pas de palette)
    expect(mockCreate).toHaveBeenCalledTimes(3)
    expect(result.palette.accent).toBe('#0073aa')
  })

  it('valide le modèle et utilise Sonnet par défaut', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      prompt: 'Test',
      apiKey: 'sk-test-123',
      model: 'gpt-4-invalid'
    })

    mockCreate
      .mockResolvedValueOnce(claudeResponse('BRIEF'))
      .mockResolvedValueOnce(claudeResponse('# Titre\n\nContenu'))
      .mockResolvedValueOnce(claudeResponse('# Titre\n\nContenu'))

    await handler(event)

    // Vérifie que le modèle par défaut est utilisé
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-4-20250514' })
    )
  })

  it('parse correctement les slides depuis le markdown', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      prompt: 'Test',
      apiKey: 'sk-test-123'
    })

    const markdown = `# Slide **1**

Intro text

[Tag1] [Tag2]

---

# Les **bases**

:::tip
Un conseil important
:::

---

# **Récapitulatif**

:::steps
1. Première étape
2. Deuxième étape
:::`

    mockCreate
      .mockResolvedValueOnce(claudeResponse('BRIEF'))
      .mockResolvedValueOnce(claudeResponse(markdown))
      .mockResolvedValueOnce(claudeResponse(markdown))

    const result = await handler(event)

    expect(result.slides).toHaveLength(3)
    expect(result.slides[0].title).toBe('Slide **1**')
    expect(result.slides[1].title).toBe('Les **bases**')
    expect(result.slides[2].title).toBe('**Récapitulatif**')
    expect(result.slides[1].content).toContain(':::tip')
    expect(result.slides[2].content).toContain(':::steps')
  })

  it('propage les erreurs API Claude', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      prompt: 'Test',
      apiKey: 'sk-invalid'
    })

    mockCreate.mockRejectedValue(new Error('Invalid API key'))

    await expect(handler(event)).rejects.toThrow('Invalid API key')
  })
})
