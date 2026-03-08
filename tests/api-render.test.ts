import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock storage utility
const mockStorageWritePresentation = vi.fn().mockResolvedValue({
  htmlUrl: '/generated/test.html',
  metadataUrl: '/generated/test.json'
})
vi.mock('../server/utils/storage', () => ({
  storageWritePresentation: (...args: any[]) => mockStorageWritePresentation(...args)
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
  mockStorageWritePresentation.mockResolvedValue({
    htmlUrl: '/generated/test.html',
    metadataUrl: '/generated/test.json'
  })
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

  it('rend le HTML et sauvegarde via storage', async () => {
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

    // Vérifie que storageWritePresentation est appelé
    expect(mockStorageWritePresentation).toHaveBeenCalledTimes(1)
    expect(mockStorageWritePresentation).toHaveBeenCalledWith(
      expect.stringMatching(/\.html$/),
      expect.stringContaining('<!DOCTYPE html>'),
      expect.objectContaining({ title: 'Ma Présentation' })
    )

    // Vérifie le filename et url
    expect(result.filename).toMatch(/\.html$/)
    expect(result.url).toBe('/generated/test.html')
  })

  it('sauvegarde les metadata correctes', async () => {
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

    const savedMetadata = mockStorageWritePresentation.mock.calls[0][2]

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

    const reviewedHtml = '<!DOCTYPE html><html><body>Reviewed</body></html>'
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: reviewedHtml }]
    })

    const result = await handler(event)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-3-5-haiku-20241022' })
    )
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

    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Le HTML semble correct, aucune modification nécessaire.' }]
    })

    const result = await handler(event)

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

    expect(result.filename).toMatch(/les-medias/)
    expect(result.filename).not.toMatch(/[&'()]/)
    expect(result.filename).toMatch(/\.html$/)
  })
})
