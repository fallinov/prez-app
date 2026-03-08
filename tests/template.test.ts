import { describe, it, expect } from 'vitest'
import { renderPresentation } from '../server/utils/template'

// Helper: rendre un slide de contenu (index 1 = pas hero) et extraire le HTML
function renderSlideContent(content: string): string {
  return renderPresentation({
    title: 'Test',
    slides: [{ title: 'Test Slide', content, preview: '' }],
    baseColor: '#059669',
    previewMode: true,
    slideStartIndex: 1, // Index 1+ = slide de contenu (pas hero)
  })
}

// Helper: vérifier que le HTML n'a pas de balises orphelines
function hasBalancedDivs(html: string): boolean {
  const openCount = (html.match(/<div[\s>]/g) || []).length
  const closeCount = (html.match(/<\/div>/g) || []).length
  return openCount === closeCount
}

describe('template.ts - renderPresentation', () => {
  it('rend une présentation basique sans erreur', () => {
    const html = renderSlideContent('Hello world')
    expect(html).toContain('Hello world')
    expect(html).toContain('<html')
    expect(hasBalancedDivs(html)).toBe(true)
  })

  describe('blocs spéciaux', () => {
    it('rend un bloc :::cards sans casser le HTML', () => {
      const content = `:::cards
[Carte 1|blue]
Description de la carte 1

[Carte 2|green]
Description de la carte 2

[Carte 3|red]
Description de la carte 3
:::`
      const html = renderSlideContent(content)
      expect(html).toContain('Carte 1')
      expect(html).toContain('Carte 2')
      expect(html).toContain('Carte 3')
      expect(hasBalancedDivs(html)).toBe(true)
    })

    it('rend un bloc :::steps sans casser le HTML', () => {
      const content = `:::steps
1. Préparer
2. Implémenter
3. Tester
:::`
      const html = renderSlideContent(content)
      expect(html).toContain('Préparer')
      expect(html).toContain('Implémenter')
      expect(html).toContain('Tester')
      expect(hasBalancedDivs(html)).toBe(true)
    })

    it('rend un bloc :::compare sans casser le HTML', () => {
      const content = `:::compare
JavaScript|70%|70|green
TypeScript|90%|90|green
Python|85%|85|yellow
:::`
      const html = renderSlideContent(content)
      expect(html).toContain('JavaScript')
      expect(html).toContain('TypeScript')
      expect(hasBalancedDivs(html)).toBe(true)
    })

    it('rend un bloc :::stats sans casser le HTML', () => {
      const content = `:::stats
42 : Réponse
100% : Couverture
3s : Temps de réponse
:::`
      const html = renderSlideContent(content)
      expect(html).toContain('Réponse')
      expect(html).toContain('Couverture')
      expect(hasBalancedDivs(html)).toBe(true)
    })

    it('rend un bloc :::points sans casser le HTML', () => {
      const content = `:::points
✓ Point positif
✗ Point négatif
→ Action requise
:::`
      const html = renderSlideContent(content)
      expect(html).toContain('Point positif')
      expect(html).toContain('Point négatif')
      expect(hasBalancedDivs(html)).toBe(true)
    })

    it('rend un bloc :::tip sans casser le HTML', () => {
      const content = `:::tip
Conseil important pour la classe
:::`
      const html = renderSlideContent(content)
      expect(html).toContain('Conseil important')
      expect(hasBalancedDivs(html)).toBe(true)
    })

    it('rend un bloc :::intro sans casser le HTML', () => {
      const content = `:::intro
Citation inspirante pour commencer
:::`
      const html = renderSlideContent(content)
      expect(html).toContain('Citation inspirante')
      expect(hasBalancedDivs(html)).toBe(true)
    })

    it('rend un bloc :::sidebar sans casser le HTML', () => {
      const content = `:::sidebar Attention
- Point important 1
- Point important 2
:::`
      const html = renderSlideContent(content)
      expect(html).toContain('Attention')
      expect(html).toContain('Point important 1')
      expect(hasBalancedDivs(html)).toBe(true)
    })

    it('rend un layout 2 colonnes (intro + sidebar) sans casser le HTML', () => {
      const content = `:::intro
Introduction du sujet avec contexte
:::

:::sidebar Points clés
- Élément A
- Élément B
- Élément C
:::`
      const html = renderSlideContent(content)
      expect(html).toContain('Introduction du sujet')
      expect(html).toContain('Points clés')
      expect(html).toContain('Élément A')
      expect(hasBalancedDivs(html)).toBe(true)
    })

    it('rend un bloc :::video sans casser le HTML', () => {
      const content = ':::video https://www.youtube.com/watch?v=dQw4w9WgXcQ:::'
      const html = renderSlideContent(content)
      expect(html).toContain('iframe')
      expect(html).toContain('youtube')
      expect(hasBalancedDivs(html)).toBe(true)
    })
  })

  describe('blocs multiples', () => {
    it('rend plusieurs blocs sur un même slide sans casser le HTML', () => {
      const content = `:::cards
[Card A|blue]
Desc A

[Card B|green]
Desc B
:::

Texte entre les blocs

:::tip
Un conseil utile
:::`
      const html = renderSlideContent(content)
      expect(html).toContain('Card A')
      expect(html).toContain('Card B')
      expect(html).toContain('conseil utile')
      expect(html).toContain('Texte entre les blocs')
      expect(hasBalancedDivs(html)).toBe(true)
    })
  })

  describe('contenu inline', () => {
    it('ne wrappe pas les blocs rendus dans des paragraphes', () => {
      const content = `:::cards
[Test|blue]
Description
:::`
      const html = renderSlideContent(content)
      // Le HTML des cards ne doit pas être wrappé dans un <p>
      expect(html).not.toMatch(/<p[^>]*><div/)
    })

    it('wrappe le texte simple dans des paragraphes', () => {
      const content = 'Texte simple sans bloc'
      const html = renderSlideContent(content)
      expect(html).toContain('<p class="text-lg text-slate-300 mb-4">')
    })

    it('gère les liens markdown', () => {
      const content = 'Visitez [Google](https://google.com) pour chercher'
      const html = renderSlideContent(content)
      expect(html).toContain('href=')
      expect(html).toContain('Google')
    })
  })

  describe('titres de slides', () => {
    it('rend le titre avec mot-clé en accent', () => {
      const html = renderSlideContent('Contenu test')
      expect(html).toContain('Test Slide')
    })
  })
})
