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

// États du formulaire - déclarés AVANT onMounted/watch
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

// États de progression
interface ProgressStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'done' | 'error'
}

const showProgressModal = ref(false)
const progressSteps = ref<ProgressStep[]>([
  { id: 'generate', label: 'Génération du contenu', status: 'pending' },
  { id: 'review', label: 'Relecture et amélioration', status: 'pending' },
  { id: 'render', label: 'Création du HTML', status: 'pending' },
  { id: 'save', label: 'Sauvegarde', status: 'pending' }
])

const currentStepIndex = computed(() => {
  const activeIndex = progressSteps.value.findIndex(s => s.status === 'active')
  if (activeIndex >= 0) return activeIndex
  const lastDone = progressSteps.value.findLastIndex(s => s.status === 'done')
  return lastDone >= 0 ? lastDone + 1 : 0
})

const progressPercent = computed(() => {
  const done = progressSteps.value.filter(s => s.status === 'done').length
  return Math.round((done / progressSteps.value.length) * 100)
})

function setStepStatus(id: string, status: ProgressStep['status']) {
  const step = progressSteps.value.find(s => s.id === id)
  if (step) step.status = status
}

function resetProgress() {
  progressSteps.value.forEach(s => s.status = 'pending')
}

// Résultat
const generatedMarkdown = ref('')
const generatedHtml = ref('')
const generatedUrl = ref('')
const slides = ref<Slide[]>([])

// Charger les présentations
async function loadPresentations() {
  try {
    presentations.value = await $fetch('/api/presentations')
  } catch {
    presentations.value = []
  }
}

// Initialisation au montage
onMounted(() => {
  user.value = sessionStorage.getItem('prez-user')
  if (!user.value) {
    navigateTo('/login')
  }
  // Charger la clé API depuis localStorage
  const savedApiKey = localStorage.getItem('prez-api-key')
  if (savedApiKey) {
    apiKey.value = savedApiKey
  }
  loadPresentations()
})

// Sauvegarder la clé API quand elle change
watch(apiKey, (newKey) => {
  if (newKey) {
    localStorage.setItem('prez-api-key', newKey)
  }
})

// Génération
async function generatePresentation() {
  if (!prompt.value || !apiKey.value) {
    error.value = 'Veuillez remplir tous les champs'
    return
  }

  loading.value = true
  error.value = ''
  resetProgress()
  showProgressModal.value = true

  // Créer un AbortController pour permettre l'annulation
  abortController.value = new AbortController()

  try {
    // Étape 1 : Génération du contenu
    setStepStatus('generate', 'active')

    // Simuler la progression entre génération et relecture
    // (l'API fait les 2 en une seule requête)
    const generatePromise = $fetch('/api/generate', {
      method: 'POST',
      body: {
        prompt: prompt.value,
        apiKey: apiKey.value,
        title: title.value || 'Présentation'
      },
      signal: abortController.value.signal
    })

    // Après 3 secondes, passer à l'étape de relecture (estimation)
    setTimeout(() => {
      if (loading.value) {
        setStepStatus('generate', 'done')
        setStepStatus('review', 'active')
      }
    }, 3000)

    const mdResponse = await generatePromise

    setStepStatus('generate', 'done')
    setStepStatus('review', 'done')

    generatedMarkdown.value = mdResponse.markdown
    slides.value = mdResponse.slides

    // Étape 3 : Création du HTML
    setStepStatus('render', 'active')
    const htmlResponse = await $fetch('/api/render', {
      method: 'POST',
      body: {
        markdown: generatedMarkdown.value,
        slides: slides.value,
        baseColor: baseColor.value,
        title: title.value || slides.value[0]?.title || 'Présentation'
      }
    })

    setStepStatus('render', 'done')

    generatedHtml.value = htmlResponse.html
    generatedUrl.value = htmlResponse.url

    // Étape 4 : Sauvegarde
    setStepStatus('save', 'active')
    await loadPresentations()
    setStepStatus('save', 'done')

    // Fermer le modal après un court délai
    setTimeout(() => {
      showProgressModal.value = false
    }, 800)

  } catch (e: any) {
    // Ignorer les erreurs d'annulation
    if (e.name === 'AbortError' || e.message?.includes('aborted')) {
      return
    }

    // Marquer l'étape en cours comme erreur
    const activeStep = progressSteps.value.find(s => s.status === 'active')
    if (activeStep) setStepStatus(activeStep.id, 'error')

    error.value = e.data?.message || 'Erreur lors de la génération'
    console.error(e)

    // Fermer le modal après un délai
    setTimeout(() => {
      showProgressModal.value = false
    }, 2000)
  } finally {
    loading.value = false
    abortController.value = null
  }
}

// Annuler la génération
const abortController = ref<AbortController | null>(null)

function cancelGeneration() {
  if (abortController.value) {
    abortController.value.abort()
  }
  loading.value = false
  showProgressModal.value = false
  resetProgress()
  error.value = 'Génération annulée'
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
            <UFormField label="Titre de la présentation" name="title" class="w-full">
              <UInput
                v-model="title"
                placeholder="Ex: Gestion des médias WordPress"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Votre clé API Claude" name="apiKey" hint="Stockée localement" class="w-full">
              <UInput
                v-model="apiKey"
                type="password"
                placeholder="sk-ant-..."
                required
                class="w-full"
              />
            </UFormField>

            <UFormField label="Couleur de base" name="color" class="w-full">
              <div class="flex items-center gap-3 w-full">
                <input
                  type="color"
                  v-model="baseColor"
                  class="w-12 h-10 rounded cursor-pointer"
                />
                <UInput v-model="baseColor" class="flex-1" />
              </div>
            </UFormField>

            <UFormField label="Décrivez votre présentation" name="prompt" class="w-full">
              <UTextarea
                v-model="prompt"
                :rows="12"
                placeholder="Ex: Créer une présentation sur l'optimisation des images pour WordPress. Inclure les formats (JPG, PNG, WebP, AVIF), la compression, le nommage SEO et le texte alternatif. Public : étudiants en informatique de gestion."
                required
                class="w-full"
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
              <span>{{ slides?.length || 0 }} slides générées</span>
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
      <UCard v-if="presentations?.length" class="mt-6">
        <template #header>
          <h2 class="text-lg font-semibold text-white">
            Présentations générées ({{ presentations?.length || 0 }})
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

    <!-- Footer -->
    <footer class="border-t border-gray-800 py-4 mt-8">
      <div class="max-w-7xl mx-auto px-6 text-center">
        <p class="text-gray-600 text-sm">
          <span class="text-primary font-semibold">PREZ</span> v1.0.0 — Générateur de présentations avec IA
        </p>
      </div>
    </footer>

    <!-- Modal de progression -->
    <UModal v-model:open="showProgressModal" :dismissible="false">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <UIcon name="i-lucide-sparkles" class="w-5 h-5 text-primary animate-pulse" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-white">Génération en cours</h3>
                <p class="text-sm text-gray-400">L'IA travaille sur votre présentation...</p>
              </div>
            </div>
            <UButton
              v-if="loading"
              variant="ghost"
              color="error"
              size="sm"
              @click="cancelGeneration"
            >
              <UIcon name="i-lucide-x" class="w-4 h-4 mr-1" />
              Annuler
            </UButton>
          </div>

          <!-- Barre de progression globale -->
          <div class="mb-6">
            <div class="flex justify-between text-sm mb-2">
              <span class="text-gray-400">Progression</span>
              <span class="text-primary font-medium">{{ progressPercent }}%</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2">
              <div
                class="bg-primary h-2 rounded-full transition-all duration-500"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>
          </div>

          <!-- Liste des étapes -->
          <div class="space-y-3">
            <div
              v-for="(step, index) in progressSteps"
              :key="step.id"
              class="flex items-center gap-3 p-3 rounded-lg transition-colors"
              :class="{
                'bg-gray-800/50': step.status === 'pending',
                'bg-primary/10 border border-primary/30': step.status === 'active',
                'bg-green-500/10': step.status === 'done',
                'bg-red-500/10': step.status === 'error'
              }"
            >
              <!-- Icône de statut -->
              <div class="w-6 h-6 flex items-center justify-center">
                <UIcon
                  v-if="step.status === 'pending'"
                  name="i-lucide-circle"
                  class="w-5 h-5 text-gray-500"
                />
                <UIcon
                  v-else-if="step.status === 'active'"
                  name="i-lucide-loader-2"
                  class="w-5 h-5 text-primary animate-spin"
                />
                <UIcon
                  v-else-if="step.status === 'done'"
                  name="i-lucide-check-circle"
                  class="w-5 h-5 text-green-400"
                />
                <UIcon
                  v-else-if="step.status === 'error'"
                  name="i-lucide-x-circle"
                  class="w-5 h-5 text-red-400"
                />
              </div>

              <!-- Numéro et label -->
              <div class="flex-1">
                <span
                  class="text-sm font-medium"
                  :class="{
                    'text-gray-500': step.status === 'pending',
                    'text-white': step.status === 'active',
                    'text-green-400': step.status === 'done',
                    'text-red-400': step.status === 'error'
                  }"
                >
                  {{ index + 1 }}. {{ step.label }}
                </span>
              </div>
            </div>
          </div>

          <!-- Message d'erreur -->
          <UAlert
            v-if="error"
            color="error"
            :title="error"
            variant="subtle"
            class="mt-4"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
