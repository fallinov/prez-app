import type { Slide } from '~/types'
import { generatePalette } from './palette'

interface RenderOptions {
  title: string
  slides: Slide[]
  baseColor: string
  mode?: 'dark' | 'light'
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  yellow: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500/20' },
  blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20' },
  green: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400', badge: 'bg-green-500/20' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20' },
  purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400', badge: 'bg-purple-500/20' },
  orange: { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20' },
  accent: { bg: 'bg-accent/20', border: 'border-accent/50', text: 'text-accent', badge: 'bg-accent/30' },
  default: { bg: 'bg-slate-900/50', border: 'border-slate-700', text: 'text-white', badge: 'bg-slate-700' }
}

// Mapping des icônes Lucide pour les formats et concepts courants
const ICON_MAP: Record<string, string> = {
  // Formats d'images
  'jpg': 'image',
  'jpeg': 'image',
  'png': 'file-image',
  'svg': 'pen-tool',
  'gif': 'film',
  'webp': 'zap',
  'avif': 'sparkles',
  // Concepts
  'performance': 'gauge',
  'seo': 'search',
  'accessibilité': 'accessibility',
  'compression': 'minimize-2',
  'redimensionner': 'maximize-2',
  'upload': 'upload',
  'download': 'download',
  'check': 'check',
  'error': 'x',
  'warning': 'alert-triangle',
  'info': 'info',
  'tip': 'lightbulb',
  'code': 'code',
  'file': 'file',
  'folder': 'folder',
  'settings': 'settings',
  'tools': 'wrench',
  'web': 'globe',
  'mobile': 'smartphone',
  'speed': 'zap',
  'slow': 'snail',
  'fast': 'rocket',
}

// Mapping emoji → icône Lucide
const EMOJI_TO_ICON: Record<string, { name: string; color: string }> = {
  // Performance / Vitesse
  '⚡': { name: 'zap', color: 'text-yellow-400' },
  '🚀': { name: 'rocket', color: 'text-green-400' },
  '🐌': { name: 'snail', color: 'text-red-400' },
  // Statuts
  '✅': { name: 'check-circle', color: 'text-green-400' },
  '✓': { name: 'check', color: 'text-green-400' },
  '❌': { name: 'x-circle', color: 'text-red-400' },
  '✗': { name: 'x', color: 'text-red-400' },
  '⚠️': { name: 'alert-triangle', color: 'text-yellow-400' },
  '⚠': { name: 'alert-triangle', color: 'text-yellow-400' },
  // Concepts
  '♿': { name: 'accessibility', color: 'text-blue-400' },
  '🤖': { name: 'bot', color: 'text-purple-400' },
  '🔄': { name: 'refresh-cw', color: 'text-cyan-400' },
  '💡': { name: 'lightbulb', color: 'text-yellow-400' },
  '📱': { name: 'smartphone', color: 'text-blue-400' },
  '🔍': { name: 'search', color: 'text-slate-300' },
  '🔥': { name: 'flame', color: 'text-orange-400' },
  '⭐': { name: 'star', color: 'text-yellow-400' },
  '🎯': { name: 'target', color: 'text-red-400' },
  '👍': { name: 'thumbs-up', color: 'text-green-400' },
  '👎': { name: 'thumbs-down', color: 'text-red-400' },
  '✨': { name: 'sparkles', color: 'text-accent' },
  '📊': { name: 'bar-chart-2', color: 'text-blue-400' },
  '📈': { name: 'trending-up', color: 'text-green-400' },
  '📉': { name: 'trending-down', color: 'text-red-400' },
  '🔒': { name: 'lock', color: 'text-slate-300' },
  '🔓': { name: 'unlock', color: 'text-green-400' },
  '📁': { name: 'folder', color: 'text-yellow-400' },
  '📄': { name: 'file-text', color: 'text-slate-300' },
  '🖼️': { name: 'image', color: 'text-purple-400' },
  '🖼': { name: 'image', color: 'text-purple-400' },
  '🌐': { name: 'globe', color: 'text-blue-400' },
  '💾': { name: 'hard-drive', color: 'text-slate-300' },
  '⏱️': { name: 'clock', color: 'text-slate-300' },
  '⏱': { name: 'clock', color: 'text-slate-300' },
}

/**
 * Génère une icône Lucide
 */
function lucideIcon(name: string, className: string = 'w-5 h-5'): string {
  return `<i data-lucide="${name}" class="${className}"></i>`
}

/**
 * Génère le HTML complet de la présentation
 */
export function renderPresentation(options: RenderOptions): string {
  const { title, slides, baseColor, mode = 'dark' } = options
  const palette = generatePalette(baseColor, mode)

  const slidesHtml = slides.map((slide, index) => renderSlide(slide, index, palette, slides.length)).join('\n')
  const navDotsHtml = slides.map((_, i) => `
    <a href="#slide-${i + 1}" class="nav-dot w-4 h-4 rounded-full bg-white/40 hover:bg-accent transition-all" title="Slide ${i + 1}"></a>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                    },
                    colors: {
                        accent: '${palette.accent}',
                        accentLight: '${palette.accentLight}',
                        accentDark: '${palette.accentDark}',
                    }
                }
            }
        }
    </script>
    <style>
        html { scroll-behavior: smooth; }
        body {
            background-color: ${palette.background};
            color: ${palette.text};
        }
        .slide {
            min-height: 100vh;
            height: 100vh;
            max-height: 100vh;
            scroll-snap-align: start;
            overflow: hidden;
        }
        .gradient-accent { background: linear-gradient(135deg, ${palette.accent} 0%, ${palette.accentDark} 100%); }

        /* Accent text sur hero slide - meilleur contraste */
        .hero-accent {
            text-shadow: 0 2px 10px rgba(0,0,0,0.5), 0 0 40px rgba(255,255,255,0.3);
            filter: brightness(1.3) contrast(1.1);
        }

        /* Code blocks */
        .code-block {
            background: #1e1e1e;
            border-radius: 0.75rem;
            padding: 1rem 1.25rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            overflow-x: auto;
        }
        .code-block .tag { color: #569cd6; }
        .code-block .attr { color: #9cdcfe; }
        .code-block .value { color: #ce9178; }

        /* Animations */
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse-slow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
        .animate-fade-in-left { animation: fadeInLeft 0.5s ease-out forwards; }
        .animate-pulse-slow { animation: pulse-slow 2s ease-in-out infinite; }

        .delay-100 { animation-delay: 0.1s; opacity: 0; }
        .delay-200 { animation-delay: 0.2s; opacity: 0; }
        .delay-300 { animation-delay: 0.3s; opacity: 0; }

        /* Navigation dots */
        .nav-dot { transition: all 0.3s ease; }
        .nav-dot.active { transform: scale(1.3); background-color: ${palette.accent} !important; }

        /* Mode contraste élevé */
        .high-contrast body,
        .high-contrast .slide,
        .high-contrast .bg-slate-900,
        .high-contrast .bg-slate-800 {
            background-color: #000000 !important;
        }
        .high-contrast .text-slate-300,
        .high-contrast .text-slate-400,
        .high-contrast .text-slate-500,
        .high-contrast .text-gray-300,
        .high-contrast .text-gray-400 {
            color: #e2e8f0 !important;
        }
        .high-contrast .text-white\\/80,
        .high-contrast .text-white\\/90 {
            color: #ffffff !important;
        }
        .high-contrast .border-slate-700,
        .high-contrast .border-slate-600 {
            border-color: rgba(255,255,255,0.3) !important;
        }
        .high-contrast .bg-slate-800\\/50,
        .high-contrast .bg-slate-700\\/50,
        .high-contrast .bg-slate-900\\/50 {
            background-color: rgba(255,255,255,0.1) !important;
        }
        .high-contrast .nav-dot:not(.active) {
            background-color: rgba(255,255,255,0.5) !important;
        }

        /* Indicateur mode contraste */
        .contrast-indicator {
            position: fixed;
            bottom: 1.5rem;
            left: 1.5rem;
            padding: 0.5rem 1rem;
            background: ${palette.accent};
            color: white;
            font-size: 0.875rem;
            font-weight: 600;
            border-radius: 9999px;
            z-index: 9999;
            display: none;
            align-items: center;
            gap: 0.5rem;
        }
        .high-contrast .contrast-indicator { display: flex; }
    </style>
</head>
<body class="font-sans overflow-x-hidden">

    <!-- Navigation latérale -->
    <nav class="fixed right-6 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-3">
        ${navDotsHtml}
    </nav>

    ${slidesHtml}

    <!-- Footer -->
    <footer class="bg-slate-900 border-t border-slate-800 py-8">
        <div class="max-w-6xl mx-auto px-6 text-center">
            <p class="text-slate-400">${escapeHtml(title)}</p>
            <p class="text-slate-500 text-sm mt-2">
                <kbd class="px-2 py-1 bg-slate-700 rounded text-slate-300 font-mono text-xs">C</kbd> Mode contraste élevé
            </p>
        </div>
    </footer>

    <!-- Indicateur mode contraste -->
    <div class="contrast-indicator">Contraste élevé (C)</div>

    <script>
        // Navigation state
        const sections = document.querySelectorAll('.slide');
        const navDots = document.querySelectorAll('.nav-dot');
        let currentSlide = 0;

        function updateNavDots(index) {
            navDots.forEach((dot, i) => {
                dot.classList.remove('active');
                if (i === index) dot.classList.add('active');
            });
        }

        function goToSlide(index) {
            if (index >= 0 && index < sections.length) {
                currentSlide = index;
                sections[index].scrollIntoView({ behavior: 'smooth' });
                updateNavDots(index);
            }
        }

        function nextSlide() { if (currentSlide < sections.length - 1) goToSlide(currentSlide + 1); }
        function prevSlide() { if (currentSlide > 0) goToSlide(currentSlide - 1); }

        // Intersection Observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const index = Array.from(sections).indexOf(entry.target);
                    if (index !== -1) {
                        currentSlide = index;
                        updateNavDots(index);
                    }
                }
            });
        }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });

        sections.forEach(section => observer.observe(section));

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                nextSlide();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                prevSlide();
            } else if (e.key === 'Home') {
                e.preventDefault();
                goToSlide(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                goToSlide(sections.length - 1);
            } else if (e.key === 'c' || e.key === 'C') {
                toggleHighContrast();
            }
        });

        // Click on nav dots
        navDots.forEach((dot, index) => {
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                goToSlide(index);
            });
        });

        // Mode contraste élevé
        function initHighContrastMode() {
            if (localStorage.getItem('highContrast') === 'true') {
                document.documentElement.classList.add('high-contrast');
            }
        }

        function toggleHighContrast() {
            const isActive = document.documentElement.classList.toggle('high-contrast');
            localStorage.setItem('highContrast', isActive.toString());
        }

        initHighContrastMode();

        // Initialiser Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    </script>
</body>
</html>`
}

/**
 * Génère le HTML d'une slide
 */
function renderSlide(slide: Slide, index: number, palette: any, totalSlides: number): string {
  const isFirst = index === 0
  const bgClass = isFirst ? 'gradient-accent' : (index % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800')

  if (isFirst) {
    return renderHeroSlide(slide, index)
  }

  return renderContentSlide(slide, index, bgClass)
}

/**
 * Slide de titre (hero)
 */
function renderHeroSlide(slide: Slide, index: number): string {
  const lines = slide.content.split('\n').filter(l => l.trim())

  let subtitle = ''
  let tags: string[] = []

  for (const line of lines) {
    const tagMatch = line.match(/\[([^\]]+)\]/g)
    if (tagMatch) {
      tags = tagMatch.map(t => t.slice(1, -1))
    } else if (!subtitle && line.trim()) {
      subtitle = line.trim()
    }
  }

  const tagsHtml = tags.length > 0
    ? `<div class="flex flex-wrap gap-3 justify-center mt-8 animate-fade-in-up delay-300">
        ${tags.map(tag => `<span class="px-4 py-2 bg-white/20 rounded-full text-sm backdrop-blur-sm">${escapeHtml(tag)}</span>`).join('')}
      </div>`
    : ''

  return `
    <section id="slide-${index + 1}" class="slide flex items-center justify-center gradient-accent relative overflow-hidden">
        <div class="absolute inset-0 opacity-10">
            <div class="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            <div class="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div class="text-center px-6 relative z-10">
            <h1 class="text-5xl md:text-7xl font-bold mb-6 animate-fade-in-up">${formatTitle(slide.title)}</h1>
            ${subtitle ? `<p class="text-xl md:text-2xl text-white/90 mb-4 animate-fade-in-up delay-100">${escapeHtml(subtitle)}</p>` : ''}
            ${tagsHtml}
            <div class="mt-16 animate-pulse-slow">
                <svg class="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                </svg>
                <p class="text-sm text-white/80 mt-2">Défiler pour commencer</p>
            </div>
        </div>
    </section>`
}

/**
 * Slide de contenu
 */
function renderContentSlide(slide: Slide, index: number, bgClass: string): string {
  const sectionLabel = extractSectionLabel(slide.title)
  const contentHtml = parseContent(slide.content)

  return `
    <section id="slide-${index + 1}" class="slide flex items-center ${bgClass} py-20">
        <div class="max-w-6xl mx-auto px-6 w-full">
            <span class="text-accent font-mono text-base mb-4 block">${String(index).padStart(2, '0')} / ${escapeHtml(sectionLabel)}</span>
            <h2 class="text-4xl md:text-5xl font-bold mb-8">${formatTitle(slide.title)}</h2>
            <div class="slide-content">
                ${contentHtml}
            </div>
        </div>
    </section>`
}

/**
 * Parse le contenu avec les blocs spéciaux
 */
function parseContent(content: string): string {
  if (!content) return ''

  let html = content

  // Protéger les blocs de code
  const codeBlocks: string[] = []
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    codeBlocks.push(renderCodeBlock(code.trim(), lang))
    return `{{CODE_${codeBlocks.length - 1}}}`
  })

  // Parser les blocs spéciaux :::type ... :::
  html = parseSpecialBlocks(html)

  // Paragraphes simples (lignes non traitées)
  html = html.split('\n').map(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('<') || trimmed.startsWith('{{')) return line
    return `<p class="text-lg text-slate-300 mb-4">${formatInlineMarkdown(trimmed)}</p>`
  }).join('\n')

  // Restaurer les blocs de code
  codeBlocks.forEach((code, i) => {
    html = html.replace(`{{CODE_${i}}}`, code)
  })

  // Nettoyer les lignes vides excessives
  html = html.replace(/\n{3,}/g, '\n\n')
  html = html.replace(/<p class="text-lg text-slate-300 mb-4"><\/p>/g, '')

  return html
}

/**
 * Parse les blocs spéciaux :::type
 */
function parseSpecialBlocks(content: string): string {
  let html = content

  // Layout 2 colonnes: :::intro + :::sidebar consécutifs
  html = html.replace(/:::intro\n([\s\S]*?):::\s*\n\s*:::sidebar\s+(.+?)\n([\s\S]*?):::/g, (_, intro, sidebarTitle, sidebarContent) => {
    return renderTwoColumnLayout(intro.trim(), sidebarTitle.trim(), sidebarContent.trim())
  })

  // :::intro seul (si pas déjà traité)
  html = html.replace(/:::intro\n([\s\S]*?):::/g, (_, inner) => {
    return renderIntroBlock(inner.trim())
  })

  // :::sidebar seul (si pas déjà traité)
  html = html.replace(/:::sidebar\s+(.+?)\n([\s\S]*?):::/g, (_, title, inner) => {
    return renderSidebarBlock(title.trim(), inner.trim())
  })

  // :::cards ... :::
  html = html.replace(/:::cards\n([\s\S]*?):::/g, (_, inner) => {
    return renderCardsBlock(inner.trim())
  })

  // :::compare ... :::
  html = html.replace(/:::compare\n([\s\S]*?):::/g, (_, inner) => {
    return renderCompareBlock(inner.trim())
  })

  // :::stats ... :::
  html = html.replace(/:::stats\n([\s\S]*?):::/g, (_, inner) => {
    return renderStatsBlock(inner.trim())
  })

  // :::steps ... :::
  html = html.replace(/:::steps\n([\s\S]*?):::/g, (_, inner) => {
    return renderStepsBlock(inner.trim())
  })

  // :::points ... :::
  html = html.replace(/:::points\n([\s\S]*?):::/g, (_, inner) => {
    return renderPointsBlock(inner.trim())
  })

  // :::tip ... :::
  html = html.replace(/:::tip\n([\s\S]*?):::/g, (_, inner) => {
    return renderTipBlock(inner.trim())
  })

  // :::image query ou url
  // Format: :::image paris tour eiffel:::  ou  :::image https://example.com/photo.jpg:::
  // Avec légende optionnelle sur la ligne suivante
  html = html.replace(/:::image\s+(.+?)\n?(.*?):::/gs, (_, source, caption) => {
    return renderImageBlock(source.trim(), caption.trim())
  })

  // :::video url:::
  // Format: :::video https://youtube.com/watch?v=xxx:::
  html = html.replace(/:::video\s+(.+?):::/g, (_, url) => {
    return renderVideoBlock(url.trim())
  })

  return html
}

/**
 * Layout 2 colonnes: intro à gauche, sidebar à droite
 */
function renderTwoColumnLayout(introContent: string, sidebarTitle: string, sidebarContent: string): string {
  const introHtml = renderIntroBlockInner(introContent)
  const sidebarHtml = renderSidebarBlockInner(sidebarTitle, sidebarContent)

  return `
    <div class="grid md:grid-cols-2 gap-12 items-start mb-8">
        <div>${introHtml}</div>
        ${sidebarHtml}
    </div>`
}

/**
 * Bloc d'introduction (inner, sans wrapper)
 */
function renderIntroBlockInner(content: string): string {
  const lines = content.split('\n')
  let quoteHtml = ''
  let textHtml = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      quoteHtml = `<blockquote class="text-xl text-slate-300 mb-6 leading-relaxed border-l-4 border-accent pl-6 italic">${escapeHtml(trimmed)}</blockquote>`
    } else if (trimmed) {
      textHtml += `<p class="text-lg text-slate-300 leading-relaxed mb-4">${formatInlineMarkdown(trimmed)}</p>`
    }
  }

  return `${quoteHtml}${textHtml}`
}

/**
 * Bloc d'introduction avec citation optionnelle
 */
function renderIntroBlock(content: string): string {
  return `<div class="mb-8">${renderIntroBlockInner(content)}</div>`
}

/**
 * Sidebar inner (sans wrapper pour 2 colonnes)
 */
function renderSidebarBlockInner(title: string, content: string): string {
  const items = content.split('\n').filter(l => l.trim())
  const itemsHtml = items.map(item => {
    const trimmed = item.trim()
    const isError = trimmed.startsWith('✗')
    const bgClass = isError ? 'bg-red-500/10' : 'bg-slate-800/50'

    // Parser: ✗ **Titre** — Description
    const match = trimmed.match(/^([✓✗])\s*\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/)
    if (match) {
      const [, symbol, itemTitle, desc] = match
      const iconName = symbol === '✗' ? 'x' : 'check'
      const iconClass = symbol === '✗' ? 'text-red-400' : 'text-green-400'
      return `
        <div class="flex items-start gap-3 p-3 ${bgClass} rounded-lg">
            ${lucideIcon(iconName, `w-5 h-5 ${iconClass} flex-shrink-0 mt-0.5`)}
            <div>
                <p class="font-medium">${escapeHtml(itemTitle)}</p>
                <p class="text-sm text-slate-300">${formatInlineMarkdown(desc)}</p>
            </div>
        </div>`
    }

    return `<div class="flex items-start gap-3 p-3 ${bgClass} rounded-lg"><span>${formatInlineMarkdown(trimmed)}</span></div>`
  }).join('')

  // Nettoyer le titre (enlever les marqueurs markdown éventuels)
  const cleanTitle = title.replace(/\*\*/g, '').trim()

  return `
    <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
        <h3 class="text-lg font-semibold mb-4 text-red-400 flex items-center gap-2">
            ${lucideIcon('alert-triangle', 'w-5 h-5')}
            ${escapeHtml(cleanTitle)}
        </h3>
        <div class="space-y-3">${itemsHtml}</div>
    </div>`
}

/**
 * Sidebar avec liste d'items (standalone)
 */
function renderSidebarBlock(title: string, content: string): string {
  return `<div class="mb-8">${renderSidebarBlockInner(title, content)}</div>`
}

/**
 * Grille de cartes avec icônes Lucide
 */
function renderCardsBlock(content: string): string {
  // Séparer par lignes vides (chaque carte est un groupe)
  const cardGroups = content.split(/\n\n+/).filter(g => g.trim())

  const cardsHtml = cardGroups.map(group => {
    const lines = group.split('\n').filter(l => l.trim())
    if (lines.length === 0) return ''

    // Première ligne: [TITRE|couleur] Description
    const headerMatch = lines[0].match(/^\[([^\]|]+)\|?(\w+)?\]\s*(.*)$/)
    if (!headerMatch) return ''

    const [, cardTitle, color = 'default', subtitle] = headerMatch
    const colorScheme = COLOR_MAP[color] || COLOR_MAP.default

    // Trouver l'icône appropriée
    const iconName = ICON_MAP[cardTitle.toLowerCase()] || 'file'
    const iconHtml = lucideIcon(iconName, `w-6 h-6 ${colorScheme.text}`)

    // Reste des lignes: ✓/✗ items
    const itemsHtml = lines.slice(1).map(line => {
      const trimmed = line.trim()
      if (trimmed.startsWith('✓')) {
        return `<li class="flex items-center gap-2 text-sm text-slate-300">${lucideIcon('check', 'w-4 h-4 text-green-400')} ${escapeHtml(trimmed.slice(1).trim())}</li>`
      } else if (trimmed.startsWith('✗')) {
        return `<li class="flex items-center gap-2 text-sm text-slate-300">${lucideIcon('x', 'w-4 h-4 text-red-400')} ${escapeHtml(trimmed.slice(1).trim())}</li>`
      }
      return `<li class="text-sm text-slate-300">${formatInlineMarkdown(trimmed)}</li>`
    }).join('')

    return `
      <div class="${colorScheme.bg} p-5 rounded-2xl border ${colorScheme.border} hover:border-accent/50 transition-colors">
          <div class="w-12 h-12 ${colorScheme.badge} rounded-xl flex items-center justify-center mb-3">
              ${iconHtml}
          </div>
          <h3 class="text-lg font-bold mb-2">${escapeHtml(cardTitle)}</h3>
          ${subtitle ? `<p class="text-slate-400 text-sm mb-2">${formatInlineMarkdown(subtitle)}</p>` : ''}
          <ul class="text-sm text-slate-300 space-y-1">${itemsHtml}</ul>
      </div>`
  }).join('')

  const numCards = cardGroups.length
  const gridCols = numCards <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'

  return `<div class="grid ${gridCols} gap-4 mb-8">${cardsHtml}</div>`
}

/**
 * Barres de comparaison
 */
function renderCompareBlock(content: string): string {
  const lines = content.split('\n').filter(l => l.trim())

  const bars = lines.map(line => {
    // Format: Label|Valeur|Pourcentage|Couleur
    const parts = line.split('|').map(p => p.trim())
    if (parts.length < 4) return null

    const [label, value, percent, color] = parts
    const percentNum = parseInt(percent)
    if (isNaN(percentNum)) return null

    const colorClass = color === 'red' ? 'bg-red-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
    const textClass = color === 'red' ? 'text-red-400' : color === 'yellow' ? 'text-yellow-400' : 'text-green-400'

    return `
      <div>
          <div class="flex justify-between text-sm mb-1">
              <span class="text-slate-300">${escapeHtml(label)}</span>
              <span class="${textClass} font-bold">${escapeHtml(value)}</span>
          </div>
          <div class="w-full bg-slate-700 rounded-full h-4">
              <div class="${colorClass} h-4 rounded-full" style="width: ${percentNum}%"></div>
          </div>
      </div>`
  }).filter(Boolean)

  // Si aucune barre valide, ne rien afficher
  if (bars.length === 0) return ''

  return `
    <div class="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 mb-8">
        <h3 class="text-lg font-bold mb-4">Comparaison de poids</h3>
        <div class="space-y-4">${bars.join('')}</div>
    </div>`
}

/**
 * Statistiques côte à côte
 */
function renderStatsBlock(content: string): string {
  const lines = content.split('\n').filter(l => l.trim())

  // Emojis positifs et négatifs pour déterminer le style
  const positiveEmojis = ['⚡', '🚀', '✅', '💚', '✓', '👍', '🎯', '💡', '📱', '🔥', '⭐', '✨']
  const negativeEmojis = ['🐌', '❌', '💔', '⚠️', '⚠', '🛑', '👎', '😢']

  const statsHtml = lines.map(line => {
    const trimmed = line.trim()
    // Détecter emoji au début (supporte les emojis multi-caractères)
    const emojiMatch = trimmed.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[⚡🐌🚀📱✅❌💚💔⭐🔥🎯💡👍👎✓⚠️⚠🛑😢✨♿🤖🔄💾🌐🖼📁📄🔒🔓📊📈📉⏱️⏱🔍])/u)
    const emoji = emojiMatch?.[1] || ''
    const rest = emoji ? trimmed.slice(emoji.length).trim() : trimmed

    // Déterminer si positif ou négatif
    const isPositive = positiveEmojis.includes(emoji) ||
      trimmed.toLowerCase().includes('rapide') ||
      trimmed.toLowerCase().includes('gain') ||
      trimmed.toLowerCase().includes('amélioration') ||
      trimmed.toLowerCase().includes('optimal')

    const isNegative = negativeEmojis.includes(emoji) ||
      trimmed.toLowerCase().includes('lent') ||
      trimmed.toLowerCase().includes('slow')

    // Par défaut: positif si non explicitement négatif
    const bgClass = isNegative ? 'bg-red-500/10' : 'bg-green-500/10'
    const textClass = isNegative ? 'text-red-400' : 'text-green-400'

    // Convertir emoji en icône Lucide
    const iconInfo = EMOJI_TO_ICON[emoji]
    const iconHtml = iconInfo
      ? lucideIcon(iconInfo.name, `w-8 h-8 ${iconInfo.color}`)
      : (emoji ? `<span class="text-3xl">${emoji}</span>` : lucideIcon('info', 'w-8 h-8 text-slate-300'))

    return `
      <div class="${bgClass} p-4 rounded-xl text-center">
          <div class="flex justify-center mb-2">${iconHtml}</div>
          <p class="${textClass} font-bold">${formatInlineMarkdown(rest.split('—')[0]?.trim() || '')}</p>
          <p class="text-sm text-slate-300">${escapeHtml(rest.split('—')[1]?.trim() || '')}</p>
      </div>`
  }).join('')

  return `<div class="grid grid-cols-2 gap-4 mb-8">${statsHtml}</div>`
}

/**
 * Étapes numérotées
 */
function renderStepsBlock(content: string): string {
  const lines = content.split('\n').filter(l => l.trim())

  const stepsHtml = lines.map(line => {
    const match = line.match(/^(\d+)\.\s*(.+)$/)
    if (!match) return ''

    const [, num, text] = match
    return `
      <li class="flex items-start gap-4">
          <span class="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center font-bold text-accent flex-shrink-0">${num}</span>
          <span class="pt-1">${formatInlineMarkdown(text)}</span>
      </li>`
  }).join('')

  return `<ol class="space-y-4 mt-4 mb-8">${stepsHtml}</ol>`
}

/**
 * Points avec icônes (non cartes)
 */
function renderPointsBlock(content: string): string {
  const lines = content.split('\n').filter(l => l.trim())

  const pointsHtml = lines.map(line => {
    const trimmed = line.trim()
    // Format: emoji **Titre** — Description
    const match = trimmed.match(/^(\S+)\s*\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/)

    if (match) {
      const [, emoji, title, desc] = match

      // Convertir emoji en icône Lucide
      const iconInfo = EMOJI_TO_ICON[emoji]
      const iconHtml = iconInfo
        ? `<div class="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
             ${lucideIcon(iconInfo.name, `w-5 h-5 ${iconInfo.color}`)}
           </div>`
        : `<div class="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
             <span class="text-xl">${emoji}</span>
           </div>`

      return `
        <div class="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            ${iconHtml}
            <div>
                <p class="font-bold text-white">${escapeHtml(title)}</p>
                <p class="text-slate-300">${formatInlineMarkdown(desc)}</p>
            </div>
        </div>`
    }

    return `<div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700">${formatInlineMarkdown(trimmed)}</div>`
  }).join('')

  return `<div class="space-y-3 mb-8">${pointsHtml}</div>`
}

/**
 * Conseil mis en valeur
 */
function renderTipBlock(content: string): string {
  // Supprimer emoji de début si présent (on va le remplacer par une icône)
  // Trim d'abord, puis regex pour capturer emojis courants au début
  let cleanContent = content.trim()
  // Supprimer les emojis de début (sparkles, lightbulb, target, star, rocket, etc.)
  cleanContent = cleanContent.replace(/^(✨|💡|🎯|⭐|🚀|✅|⚡|🔥)\s*/g, '')

  return `
    <div class="bg-accent/10 border border-accent/30 p-4 rounded-2xl mt-6 mb-8 flex items-start gap-3">
        <div class="flex-shrink-0 mt-0.5">${lucideIcon('lightbulb', 'w-5 h-5 text-accent')}</div>
        <p class="text-accent font-medium">${formatInlineMarkdown(cleanContent)}</p>
    </div>`
}

/**
 * Bloc image (Unsplash ou URL directe)
 * Format: :::image paris tour eiffel::: ou :::image https://example.com/photo.jpg:::
 */
function renderImageBlock(source: string, caption: string): string {
  let imageUrl: string
  let altText: string

  // Vérifier si c'est une URL directe
  if (source.startsWith('http://') || source.startsWith('https://')) {
    imageUrl = source
    altText = caption || 'Image'
  } else {
    // Utiliser Unsplash Source API (gratuit, pas de clé requise)
    // Format: https://source.unsplash.com/1600x900/?query
    const query = encodeURIComponent(source)
    imageUrl = `https://source.unsplash.com/1600x900/?${query}`
    altText = caption || source
  }

  const captionHtml = caption
    ? `<figcaption class="text-center text-sm text-slate-400 mt-3">${escapeHtml(caption)}</figcaption>`
    : ''

  return `
    <figure class="mb-8">
        <div class="rounded-2xl overflow-hidden shadow-lg">
            <img src="${imageUrl}" alt="${escapeHtml(altText)}" class="w-full h-auto object-cover max-h-96" loading="lazy" />
        </div>
        ${captionHtml}
    </figure>`
}

/**
 * Bloc vidéo (YouTube, Vimeo)
 * Format: :::video https://youtube.com/watch?v=xxx:::
 */
function renderVideoBlock(url: string): string {
  let embedUrl = ''

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) {
    embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }

  if (!embedUrl) {
    // URL non reconnue, afficher un lien
    return `
      <div class="mb-8 p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
          <a href="${escapeHtml(url)}" target="_blank" class="text-accent hover:underline flex items-center gap-2">
              ${lucideIcon('play-circle', 'w-6 h-6')}
              Voir la vidéo
          </a>
      </div>`
  }

  return `
    <div class="mb-8">
        <div class="relative rounded-2xl overflow-hidden shadow-lg" style="padding-bottom: 56.25%;">
            <iframe
                src="${embedUrl}"
                class="absolute inset-0 w-full h-full"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
            ></iframe>
        </div>
    </div>`
}

/**
 * Bloc de code avec coloration syntaxique basique
 */
function renderCodeBlock(code: string, lang?: string): string {
  let highlighted = escapeHtml(code)

  if (lang === 'html' || lang === 'xml') {
    // Ordre important: valeurs d'abord, puis attributs, puis tags
    // Valeurs entre guillemets (escaped quotes)
    highlighted = highlighted.replace(/(&quot;)([^&]*)(&quot;)/g, '<span class="value">$1$2$3</span>')

    // Attributs (mot suivi de =, mais pas déjà dans un span)
    highlighted = highlighted.replace(/\b([\w-]+)(=)(?!&quot;)/g, '<span class="attr">$1</span>$2')
    highlighted = highlighted.replace(/\b([\w-]+)(=<span class="value">)/g, '<span class="attr">$1</span>=$2')

    // Tags (après &lt; ou &lt;/)
    highlighted = highlighted.replace(/(&lt;)(\/?)([\w-]+)/g, '$1$2<span class="tag">$3</span>')
  }

  return `<div class="code-block my-4"><pre><code>${highlighted}</code></pre></div>`
}

/**
 * Extrait le label de section du titre
 */
function extractSectionLabel(title: string): string {
  return title.replace(/\*\*/g, '').split('—')[0]?.trim() || title.replace(/\*\*/g, '')
}

/**
 * Formate le titre avec accent sur les mots en gras
 */
function formatTitle(title: string): string {
  let result = escapeHtml(title)
  // Remplacer **mot** par <span class="text-accent hero-accent">mot</span>
  // hero-accent ajoute une ombre pour le contraste sur les fonds gradient
  result = result.replace(/\*\*([^*]+)\*\*/g, '<span class="text-accent hero-accent">$1</span>')
  return result
}

/**
 * Formate le markdown inline (gras, italique, code, liens)
 */
function formatInlineMarkdown(text: string): string {
  return text
    // Liens markdown [texte](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-accent hover:underline">$1</a>')
    // Gras
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    // Italique
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code inline
    .replace(/`(.+?)`/g, '<code class="bg-slate-700 px-2 py-0.5 rounded font-mono text-sm text-accent">$1</code>')
    // Flèches
    .replace(/→/g, '<span class="text-accent">→</span>')
    // Checkmarks
    .replace(/✓/g, '<span class="text-green-400">✓</span>')
    .replace(/✗/g, '<span class="text-red-400">✗</span>')
}

/**
 * Échappe les caractères HTML
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}
