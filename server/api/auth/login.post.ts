export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { email } = await readBody(event)

  if (!email) {
    throw createError({
      statusCode: 400,
      message: 'Email requis'
    })
  }

  // Liste des emails autorisés depuis la config
  const allowedEmails = config.allowedEmails.split(',').map((e: string) => e.trim().toLowerCase())

  if (!allowedEmails.includes(email.toLowerCase())) {
    throw createError({
      statusCode: 401,
      message: 'Email non autorisé'
    })
  }

  // En production, on créerait une vraie session ici
  // Pour le prototype, on retourne juste un succès
  return {
    success: true,
    email: email
  }
})
