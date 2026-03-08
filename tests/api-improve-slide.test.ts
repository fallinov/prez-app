import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock storage utility
const mockStorageReadMetadata = vi.fn()
const mockStorageWritePresentation = vi.fn().mockResolvedValue({
  htmlUrl: '/generated/test.html',
  metadataUrl: '/generated/test.json'
})
vi.mock('../server/utils/storage', () => ({
  storageReadMetadata: (...args: any[]) => mockStorageReadMetadata(...args),
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

const sampleMetadata = {
  title: 'Ma Présentation',
  markdown: `# Titre **principal**

Sous-titre accrocheur

[Tag1] [Tag2]

---

# Les **bases**

:::cards
[HTML|blue] Structure
✓ Sémantique
✓ Accessible

[CSS|green] Style
✓ Responsive
✓ Animations
:::

---

# **Récapitulatif**

:::steps
1. Apprendre HTML
2. Maîtriser CSS
3. Pratiquer
:::`,
  baseColor: '#3b82f6',
  palette: {
    accent: '#3b82f6',
    accentContrast: '#ffffff',
    accentLight: '#60a5fa',
    accentDark: '#2563eb',
    textHighlight: '#fbbf24'
  },
  model: 'claude-sonnet-4-6',
  createdAt: '2026-03-08T10:00:00.000Z'
}

let handler: any
beforeEach(async () => {
  vi.clearAllMocks()
  mockStorageReadMetadata.mockResolvedValue({ ...sampleMetadata })
  mockStorageWritePresentation.mockResolvedValue({
    htmlUrl: '/generated/test.html',
    metadataUrl: '/generated/test.json'
  })
  const mod = await import('../server/api/improve-slide.post')
  handler = mod.default
})

describe('improve-slide.post.ts', () => {
  it('rejette si paramètres manquants', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      filename: 'test.html',
      apiKey: 'sk-test'
    })

    await expect(handler(event)).rejects.toThrow('Filename, slideIndex, instructions et clé API requis')
  })

  it('rejette si metadata non trouvée', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      filename: 'inexistant.html',
      slideIndex: 0,
      instructions: 'Changer le titre',
      apiKey: 'sk-test'
    })
    mockStorageReadMetadata.mockResolvedValue(null)

    await expect(handler(event)).rejects.toThrow('Metadata non trouvée')
  })

  it('rejette si slideIndex hors limites', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      filename: 'test.html',
      slideIndex: 99,
      instructions: 'Changer le titre',
      apiKey: 'sk-test'
    })

    await expect(handler(event)).rejects.toThrow('Index de slide invalide')
  })

  it('modifie un slide et re-rend le HTML', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      filename: 'test.html',
      slideIndex: 1,
      instructions: 'Ajouter un point sur JavaScript',
      apiKey: 'sk-test'
    })

    const improvedSlide = `# Les **bases** du web

:::cards
[HTML|blue] Structure
✓ Sémantique
✓ Accessible

[CSS|green] Style
✓ Responsive
✓ Animations

[JS|yellow] Interaction
✓ Dynamique
✓ Événements
:::`

    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: improvedSlide }]
    })

    const result = await handler(event)

    expect(result).toHaveProperty('markdown')
    expect(result).toHaveProperty('slides')
    expect(result).toHaveProperty('html')
    expect(result.modifiedSlideIndex).toBe(1)
    expect(result.markdown).toContain('JS')
    expect(result.slides).toHaveLength(3)
    expect(result.html).toContain('<!DOCTYPE html>')

    // Storage est appelé
    expect(mockStorageWritePresentation).toHaveBeenCalledTimes(1)
  })

  it('utilise le modèle spécifié ou celui des metadata', async () => {
    const event = {} as any

    readBody.mockResolvedValue({
      filename: 'test.html',
      slideIndex: 1,
      instructions: 'Test',
      apiKey: 'sk-test',
      model: 'claude-opus-4-6'
    })

    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '# Test\n\nContenu' }]
    })

    await handler(event)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-opus-4-6' })
    )
  })

  it('conserve les autres slides intactes', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      filename: 'test.html',
      slideIndex: 1,
      instructions: 'Changer ce slide',
      apiKey: 'sk-test'
    })

    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '# Nouveau **contenu**\n\nTexte modifié' }]
    })

    const result = await handler(event)

    expect(result.slides[0].title).toContain('principal')
    expect(result.slides[2].title).toContain('Récapitulatif')
    expect(result.slides[1].title).toContain('Nouveau')
  })

  it('met à jour les metadata sauvegardées', async () => {
    const event = {} as any
    readBody.mockResolvedValue({
      filename: 'test.html',
      slideIndex: 0,
      instructions: 'Changer le titre hero',
      apiKey: 'sk-test'
    })

    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '# Nouveau **titre**\n\nSous-titre\n\n[Tag]' }]
    })

    await handler(event)

    const savedMetadata = mockStorageWritePresentation.mock.calls[0][2]
    expect(savedMetadata.markdown).toContain('Nouveau **titre**')
    expect(savedMetadata.title).toBe('Ma Présentation')
    expect(savedMetadata.palette).toEqual(sampleMetadata.palette)
  })
})
