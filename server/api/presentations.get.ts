import { readdir, stat } from 'fs/promises'
import { join } from 'path'

interface PresentationFile {
  filename: string
  url: string
  title: string
  date: string
  size: number
}

export default defineEventHandler(async (): Promise<PresentationFile[]> => {
  const publicDir = join(process.cwd(), 'public', 'generated')

  try {
    const files = await readdir(publicDir)
    const htmlFiles = files.filter(f => f.endsWith('.html'))

    const presentations: PresentationFile[] = []

    for (const filename of htmlFiles) {
      const filepath = join(publicDir, filename)
      const stats = await stat(filepath)

      // Extraire date et titre du nom de fichier
      // Format: 2026-02-06_14h30_titre-slug.html
      const match = filename.match(/^(\d{4}-\d{2}-\d{2}_\d{2}h\d{2})_(.+)\.html$/)

      let date = ''
      let title = filename

      if (match) {
        date = match[1].replace('_', ' ').replace('h', ':')
        title = match[2].replace(/-/g, ' ')
        // Capitalize first letter
        title = title.charAt(0).toUpperCase() + title.slice(1)
      }

      presentations.push({
        filename,
        url: `/generated/${filename}`,
        title,
        date,
        size: stats.size
      })
    }

    // Trier par date décroissante (plus récent en premier)
    presentations.sort((a, b) => b.filename.localeCompare(a.filename))

    return presentations
  } catch {
    // Dossier n'existe pas encore
    return []
  }
})
