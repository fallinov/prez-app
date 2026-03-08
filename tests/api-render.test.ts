import { describe, it, expect, vi, beforeEach } from 'vitest'
import { writeFile, mkdir } from 'fs/promises'

// Mock fs/promises
vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined)
}))

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

let handler: any
beforeEach(async () => {
  vi.clearAllMocks()
  const mod = await import('../server/api/render.post')
  handler = mod.default
})

describe('render.post.ts', () => {
  const validSlides = [
    { title: 'Titre principal', content: 'Sous-titre\n\n[Tag1] [Tag2]', preview: 'Sous-titre...' },
    { title: 'Les **bases**', content: ':::tip\nUn conseil\n:::', preview: 'Un conseil...' }
  ]

  it('rejette si pas de slides', async () => {
    const event = {} as any
    readBody.mockResolvedValue({ slides: [] })

    await expect(handler(event)).rejects.toThrow('Slides requises')
  })

  it('rend le HTML et sauvegarde les fichiers', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      slides: validSlides,
      baseColor: '#059669',
      title: 'Ma Présentation'
    })

    const result = await handler(event)

    // Vérifie que le HTML est généré
    expect(result.html).toContain('<!DOCTYPE html>')
    expect(result.html).toContain('Ma Présentation')
    expect(result.html).toContain('Les')

    // Vérifie que les fichiers sont sauvegardés
    expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('public/generated'), { recursive: true })
    expect(writeFile).toHaveBeenCalledTimes(2) // HTML + JSON metadata

    // Vérifie le filename
    expect(result.filename).toMatch(/\.html$/)
    expect(result.url).toMatch(/^\/generated\//)
  })

  it('sauvegarde les metadata JSON correctes', async () => {
    const event = {} as any
    const palette = {
      accent: '#059669',
      accentContrast: '#ffffff',
      accentLight: '#2ba680',
      accentDark: '#048059',
      textHighlight: '#fbbf24'
    }
    readBody.mockResolvedValue({
      slides: validSlides,
      baseColor: '#059669',
      title: 'Test',
      markdown: '# Test\n\nContenu',
      palette,
      model: 'claude-opus-4-20250514'
    })

    await handler(event)

    // Le 2ème writeFile est le JSON metadata
    const metadataCall = vi.mocked(writeFile).mock.calls[1]
    const savedMetadata = JSON.parse(metadataCall[1] as string)

    expect(savedMetadata.title).toBe('Test')
    expect(savedMetadata.markdown).toBe('# Test\n\nContenu')
    expect(savedMetadata.baseColor).toBe('#059669')
    expect(savedMetadata.palette).toEqual(palette)
    expect(savedMetadata.model).toBe('claude-opus-4-20250514')
    expect(savedMetadata.createdAt).toBeTruthy()
  })

  it('applique la revue HTML par Claude si apiKey fournie', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      slides: validSlides,
      baseColor: '#059669',
      title: 'Test',
      apiKey: 'sk-test-123'
    })

    // La revue retourne un HTML modifié
    const reviewedHtml = '<!DOCTYPE html><html><body>Reviewed</body></html>'
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: reviewedHtml }]
    })

    const result = await handler(event)

    // L'appel utilise Haiku
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-3-5-haiku-20241022' })
    )

    // Le HTML retourné est celui de la revue
    expect(result.html).toBe(reviewedHtml)
  })

  it('garde le HTML original si la revue retourne un format invalide', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      slides: validSlides,
      baseColor: '#059669',
      title: 'Test',
      apiKey: 'sk-test-123'
    })

    // La revue retourne du texte invalide (pas de <!DOCTYPE)
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Le HTML semble correct, aucune modification nécessaire.' }]
    })

    const result = await handler(event)

    // Le HTML original est conservé
    expect(result.html).toContain('<!DOCTYPE html>')
    expect(result.html).not.toContain('aucune modification')
  })

  it('continue sans erreur si la revue Claude échoue', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      slides: validSlides,
      baseColor: '#059669',
      title: 'Test',
      apiKey: 'sk-test-123'
    })

    mockCreate.mockRejectedValueOnce(new Error('Rate limited'))

    const result = await handler(event)

    // Le HTML original est quand même retourné
    expect(result.html).toContain('<!DOCTYPE html>')
    expect(result.filename).toMatch(/\.html$/)
  })

  it('génère un slug correct dans le filename', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      slides: validSlides,
      baseColor: '#059669',
      title: 'Les Médias & l\'Optimisation (2026)'
    })

    const result = await handler(event)

    // Le slug doit être normalisé
    expect(result.filename).toMatch(/les-medias/)
    expect(result.filename).not.toMatch(/[&'()]/)
    expect(result.filename).toMatch(/\.html$/)
  })
})
