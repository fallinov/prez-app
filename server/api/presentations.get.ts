import { storageList } from '../utils/storage'

interface PresentationFile {
  filename: string
  url: string
  title: string
  date: string
  size: number
}

export default defineEventHandler(async (): Promise<PresentationFile[]> => {
  const files = await storageList()

  return files.map(file => {
    // Extraire date et titre du nom de fichier
    // Format: 2026-02-06_14h30_titre-slug.html
    const match = file.filename.match(/^(\d{4}-\d{2}-\d{2}_\d{2}h\d{2})_(.+)\.html$/)

    let date = ''
    let title = file.filename

    if (match) {
      date = match[1].replace('_', ' ').replace('h', ':')
      title = match[2].replace(/-/g, ' ')
      title = title.charAt(0).toUpperCase() + title.slice(1)
    }

    return {
      filename: file.filename,
      url: file.url,
      title,
      date,
      size: file.size
    }
  })
})
