export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: ['@nuxt/ui'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Clé secrète pour les sessions (côté serveur uniquement)
    sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
    // Emails autorisés (séparés par des virgules)
    allowedEmails: process.env.ALLOWED_EMAILS || 'steve@esig.ch',
  },

  app: {
    head: {
      title: 'PREZ - Générateur de présentations',
      meta: [
        { name: 'description', content: 'Générez des présentations pédagogiques avec l\'IA' }
      ]
    }
  }
})
