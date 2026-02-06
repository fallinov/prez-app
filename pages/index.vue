<script setup lang="ts">
import type { Slide } from '~/types'

interface PresentationFile {
  filename: string
  url: string
  title: string
  date: string
  size: number
}

// Vérifier la session
const user = ref<string | null>(null)

// Liste des présentations existantes
const presentations = ref<PresentationFile[]>([])

async function loadPresentations() {
  try {
    presentations.value = await $fetch('/api/presentations')
  } catch {
    presentations.value = []
  }
}

onMounted(() => {
  user.value = sessionStorage.getItem('prez-user')
  if (!user.value) {
    navigateTo('/login')
  }
  loadPresentations()
})

// États du formulaire (valeurs par défaut pour tests)
const prompt = ref(`Créer une présentation en te basant sur ce cours :

# Gestion des médias

Les images (photos, schémas, dessins) sont des contenus très appréciés des visiteurs. Car comme le dit l'adage : "Un bon croquis vaut mieux qu'un long discours"

Cependant, une mauvaise gestion de vos images va se ressentir sur le classement de votre site, et peut agacer vos visiteurs. Pages lourdes qui mettent des plombes à charger, et 3 secondes c'est déjà une éternité pour un internaute.

Erreurs fréquentes à éviter :
- Utiliser un mauvais format d'image
- Images trop "lourdes" - pas compressées
- Images trop "grandes" - pas redimensionnées
- Nom de fichier incompréhensible (DSC00345.jpg)
- Absence de texte alternatif

## 1. Utiliser le bon format d'image

- JPG (JPEG) : Idéal pour les photos, compression efficace, pas de transparence
- PNG : Logos, graphiques, transparence, qualité sans perte
- SVG : Icônes vectorielles, redimensionnement infini, très léger
- GIF : Animations simples, 256 couleurs max
- WebP : Format moderne Google, 25-35% plus léger que JPG, transparence supportée

## 2. Redimensionner ses images

Maximum utile : rarement plus de 1800px de large sur un site. Ne pas envoyer des images de 5000px du smartphone.

Comment connaître la largeur max utile ? Inspecter la taille réelle d'affichage avec les DevTools.

## 3. Compresser ses images

Trouver le compromis entre taille, poids et qualité :
- Résolution : 300 DPI → 72-96 DPI pour le web
- Compression : 100% → 60-80% (bon compromis)

Outils : compressjpeg.com, tinypng.com, squoosh.app
Plugins WordPress : Imagify, EWWW, ShortPixel

## 4. Utiliser des noms descriptifs

Mauvais : DSC_004372.jpg, Photo.jpg, img_23.png
Bon : pneu-hiver-michelin-alpin-6.jpg, asterix-bretons-couverture.jpg

Règles : mots-clés, tirets (-), minuscules, pas d'accents

## 5. Texte alternatif

Attribut alt essentiel pour :
- Accessibilité (liseuses d'écran)
- SEO (robots Google)
- Fallback si image non chargée

Exemple : <img src="etang-gruere.jpg" alt="Vue de l'étang de la Gruère depuis la berge" />

WordPress : remplir le champ "Texte alternatif" dans la médiathèque.`)

const apiKey = ref('')
const baseColor = ref('#0073aa')
const title = ref('Gestion des médias WordPress')
const loading = ref(false)
const error = ref('')

// Résultat
const generatedMarkdown = ref('')
const generatedHtml = ref('')
const generatedUrl = ref('')
const slides = ref<Slide[]>([])

// Génération
async function generatePresentation() {
  if (!prompt.value || !apiKey.value) {
    error.value = 'Veuillez remplir tous les champs'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // 1. Générer le Markdown avec Claude
    const mdResponse = await $fetch('/api/generate', {
      method: 'POST',
      body: {
        prompt: prompt.value,
        apiKey: apiKey.value,
        title: title.value || 'Présentation'
      }
    })

    generatedMarkdown.value = mdResponse.markdown
    slides.value = mdResponse.slides

    // 2. Générer le HTML
    const htmlResponse = await $fetch('/api/render', {
      method: 'POST',
      body: {
        markdown: generatedMarkdown.value,
        slides: slides.value,
        baseColor: baseColor.value,
        title: title.value || slides.value[0]?.title || 'Présentation'
      }
    })

    generatedHtml.value = htmlResponse.html
    generatedUrl.value = htmlResponse.url

    // Recharger la liste
    await loadPresentations()

  } catch (e: any) {
    error.value = e.data?.message || 'Erreur lors de la génération'
    console.error(e)
  } finally {
    loading.value = false
  }
}

// Télécharger le HTML
function downloadHtml() {
  const blob = new Blob([generatedHtml.value], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.value || 'presentation'}.html`
  a.click()
  URL.revokeObjectURL(url)
}

// Formater la taille du fichier
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(0)} KB`
}

// Déconnexion
function logout() {
  sessionStorage.removeItem('prez-user')
  navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-900">
    <!-- Header -->
    <header class="border-b border-gray-800 p-4">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <h1 class="text-xl font-bold text-white">PREZ</h1>
        <div class="flex items-center gap-4">
          <span class="text-gray-400 text-sm">{{ user }}</span>
          <UButton variant="ghost" size="sm" @click="logout">
            Déconnexion
          </UButton>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="max-w-7xl mx-auto p-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Formulaire -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold text-white">Nouvelle présentation</h2>
          </template>

          <form @submit.prevent="generatePresentation" class="space-y-4">
            <UFormField label="Titre de la présentation" name="title">
              <UInput
                v-model="title"
                placeholder="Ex: Gestion des médias WordPress"
              />
            </UFormField>

            <UFormField label="Votre clé API Claude" name="apiKey" hint="Non stockée">
              <UInput
                v-model="apiKey"
                type="password"
                placeholder="sk-ant-..."
                required
              />
            </UFormField>

            <UFormField label="Couleur de base" name="color">
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  v-model="baseColor"
                  class="w-12 h-10 rounded cursor-pointer"
                />
                <UInput v-model="baseColor" class="flex-1" />
              </div>
            </UFormField>

            <UFormField label="Décrivez votre présentation" name="prompt">
              <UTextarea
                v-model="prompt"
                :rows="6"
                placeholder="Ex: Créer une présentation sur l'optimisation des images pour WordPress. Inclure les formats (JPG, PNG, WebP, AVIF), la compression, le nommage SEO et le texte alternatif. Public : étudiants en informatique de gestion."
                required
              />
            </UFormField>

            <UAlert
              v-if="error"
              color="error"
              :title="error"
              variant="subtle"
              class="mb-4"
            />

            <UButton
              type="submit"
              block
              size="lg"
              :loading="loading"
              :disabled="!prompt || !apiKey"
            >
              {{ loading ? 'Génération en cours...' : 'Générer la présentation' }}
            </UButton>
          </form>
        </UCard>

        <!-- Résultat -->
        <UCard v-if="generatedHtml">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-white">Résultat</h2>
              <div class="flex gap-2">
                <UButton
                  v-if="generatedUrl"
                  :to="generatedUrl"
                  target="_blank"
                  variant="outline"
                >
                  Ouvrir
                </UButton>
                <UButton @click="downloadHtml" color="primary">
                  Télécharger HTML
                </UButton>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <div class="flex items-center justify-between text-sm text-gray-400">
              <span>{{ slides.length }} slides générées</span>
              <code v-if="generatedUrl" class="text-xs bg-gray-800 px-2 py-1 rounded">
                {{ generatedUrl }}
              </code>
            </div>

            <!-- Liste des slides -->
            <div class="space-y-2">
              <div
                v-for="(slide, i) in slides"
                :key="i"
                class="p-3 bg-gray-800 rounded-lg"
              >
                <div class="font-medium text-white">
                  {{ i + 1 }}. {{ slide.title }}
                </div>
                <div class="text-sm text-gray-400 mt-1 line-clamp-2">
                  {{ slide.preview }}
                </div>
              </div>
            </div>

            <!-- Preview iframe -->
            <div class="mt-4">
              <h3 class="text-sm font-medium text-gray-400 mb-2">Preview</h3>
              <iframe
                :srcdoc="generatedHtml"
                class="w-full h-96 rounded-lg border border-gray-700"
              />
            </div>
          </div>
        </UCard>

        <!-- Placeholder si pas de résultat -->
        <UCard v-else class="flex items-center justify-center min-h-[400px]">
          <div class="text-center text-gray-500">
            <div class="text-4xl mb-4">📊</div>
            <p>Votre présentation apparaîtra ici</p>
          </div>
        </UCard>
      </div>

      <!-- Présentations existantes -->
      <UCard v-if="presentations.length" class="mt-6">
        <template #header>
          <h2 class="text-lg font-semibold text-white">
            Présentations générées ({{ presentations.length }})
          </h2>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <a
            v-for="pres in presentations"
            :key="pres.filename"
            :href="pres.url"
            target="_blank"
            class="p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
          >
            <div class="font-medium text-white group-hover:text-blue-400 truncate">
              {{ pres.title }}
            </div>
            <div class="text-xs text-gray-500 mt-1 flex justify-between">
              <span>{{ pres.date }}</span>
              <span>{{ formatSize(pres.size) }}</span>
            </div>
          </a>
        </div>
      </UCard>
    </main>
  </div>
</template>
