export interface Palette {
  background: string
  text: string
  accent: string
  accentLight: string
  accentDark: string
}

/**
 * Calcule la luminance relative d'une couleur
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  const [r, g, b] = rgb.map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Convertit hex en RGB
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0, 0, 0]
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ]
}

/**
 * Convertit RGB en hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

/**
 * Éclaircit une couleur
 */
function lighten(hex: string, percent: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(
    r + (255 - r) * (percent / 100),
    g + (255 - g) * (percent / 100),
    b + (255 - b) * (percent / 100)
  )
}

/**
 * Assombrit une couleur
 */
function darken(hex: string, percent: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(
    r * (1 - percent / 100),
    g * (1 - percent / 100),
    b * (1 - percent / 100)
  )
}

/**
 * Calcule le ratio de contraste entre deux couleurs
 */
function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1)
  const l2 = getLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Génère une palette accessible à partir d'une couleur de base
 */
export function generatePalette(baseColor: string, mode: 'dark' | 'light' = 'dark'): Palette {
  const isDark = mode === 'dark'

  // Couleurs de fond et texte
  const background = isDark ? '#0f172a' : '#f8fafc'
  const text = isDark ? '#f1f5f9' : '#0f172a'

  // Ajuster l'accent pour garantir le contraste
  let accent = baseColor
  const minContrast = 4.5

  // Si le contraste est insuffisant, ajuster
  if (getContrastRatio(accent, background) < minContrast) {
    accent = isDark ? lighten(baseColor, 20) : darken(baseColor, 20)
  }

  // Variantes de l'accent
  const accentLight = lighten(accent, 15)
  const accentDark = darken(accent, 15)

  return {
    background,
    text,
    accent,
    accentLight,
    accentDark
  }
}

/**
 * Vérifie si une palette est accessible (WCAG AA)
 */
export function validatePalette(palette: Palette): boolean {
  const textContrast = getContrastRatio(palette.text, palette.background)
  const accentContrast = getContrastRatio(palette.accent, palette.background)

  return textContrast >= 4.5 && accentContrast >= 3
}
