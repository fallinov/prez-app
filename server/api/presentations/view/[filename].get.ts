import { storageRead } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')

  if (!filename) {
    throw createError({ statusCode: 400, message: 'Filename requis' })
  }

  const html = await storageRead(filename)
  if (!html) {
    throw createError({ statusCode: 404, message: 'Présentation non trouvée' })
  }

  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  return html
})
