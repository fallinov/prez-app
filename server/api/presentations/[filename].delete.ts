import { storageDelete } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')

  if (!filename) {
    throw createError({
      statusCode: 400,
      message: 'Filename requis'
    })
  }

  // Supprimer le HTML et les metadata
  const metadataFilename = filename.replace('.html', '.json')
  await Promise.all([
    storageDelete(filename),
    storageDelete(metadataFilename)
  ])

  return { success: true }
})
