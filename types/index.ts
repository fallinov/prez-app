export interface Slide {
  title: string
  content: string
  preview: string
  notes?: string
}

export interface Palette {
  background: string
  text: string
  accent: string
  accentLight: string
}

export interface PresentationMeta {
  title: string
  subtitle?: string
  author?: string
  date?: string
  theme: {
    baseColor: string
    mode: 'dark' | 'light'
  }
}
