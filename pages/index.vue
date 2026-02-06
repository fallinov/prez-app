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

// Modèles LLM disponibles
const modelOptions = [
  { label: 'Claude Sonnet 4 (Recommandé)', value: 'claude-sonnet-4-20250514' },
  { label: 'Claude Opus 4 (Plus puissant)', value: 'claude-opus-4-20250514' },
  { label: 'Claude Haiku 3.5 (Rapide)', value: 'claude-3-5-haiku-20241022' }
]
const selectedModel = ref('claude-sonnet-4-20250514')
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
  { id: 'palette', label: 'Génération de la palette WCAG', status: 'pending' },
  { id: 'generate', label: 'Génération du contenu', status: 'pending' },
  { id: 'review', label: 'Relecture et amélioration', status: 'pending' },
  { id: 'render', label: 'Création du HTML', status: 'pending' },
  { id: 'ux-review', label: 'Revue UX et accessibilité', status: 'pending' },
  { id: 'save', label: 'Sauvegarde', status: 'pending' }
])

// Palette générée par l'IA
interface GeneratedPalette {
  accent: string
  accentContrast: string
  accentLight: string
  accentDark: string
  textHighlight: string
}
const generatedPalette = ref<GeneratedPalette | null>(null)

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

// Modal d'amélioration
const showImproveModal = ref(false)
const improveInstructions = ref('')
const improvingPresentation = ref<PresentationFile | null>(null)
const improveLoading = ref(false)
const improveError = ref('')

function openImproveModal(pres: PresentationFile) {
  improvingPresentation.value = pres
  improveInstructions.value = ''
  improveError.value = ''
  showImproveModal.value = true
}

async function improvePresentation() {
  if (!improvingPresentation.value || !improveInstructions.value.trim() || !apiKey.value) {
    improveError.value = 'Instructions et clé API requises'
    return
  }

  improveLoading.value = true
  improveError.value = ''

  try {
    // Étape 1 : Modifier le Markdown
    const improveResponse = await $fetch('/api/improve', {
      method: 'POST',
      body: {
        filename: improvingPresentation.value.filename,
        instructions: improveInstructions.value,
        apiKey: apiKey.value,
        model: selectedModel.value
      }
    })

    // Étape 2 : Re-render avec le pipeline existant
    const renderResponse = await $fetch('/api/render', {
      method: 'POST',
      body: {
        markdown: improveResponse.markdown,
        slides: improveResponse.slides,
        baseColor: improveResponse.baseColor,
        title: improveResponse.title,
        apiKey: apiKey.value,
        palette: improveResponse.palette,
        model: improveResponse.model
      }
    })

    // Mettre à jour les résultats
    generatedMarkdown.value = improveResponse.markdown
    slides.value = improveResponse.slides
    generatedHtml.value = renderResponse.html
    generatedUrl.value = renderResponse.url

    // Fermer le modal et recharger la liste
    showImproveModal.value = false
    await loadPresentations()

  } catch (e: any) {
    improveError.value = e.data?.message || 'Erreur lors de l\'amélioration'
    console.error(e)
  } finally {
    improveLoading.value = false
  }
}

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
    // Étape 1 : Génération palette + contenu (l'API fait palette → génération → relecture)
    setStepStatus('palette', 'active')

    const generatePromise = $fetch('/api/generate', {
      method: 'POST',
      body: {
        prompt: prompt.value,
        apiKey: apiKey.value,
        title: title.value || 'Présentation',
        model: selectedModel.value,
        baseColor: baseColor.value
      },
      signal: abortController.value.signal
    })

    // Progression simulée : palette (1s) → génération (2s) → relecture
    setTimeout(() => {
      if (loading.value) {
        setStepStatus('palette', 'done')
        setStepStatus('generate', 'active')
      }
    }, 1000)

    setTimeout(() => {
      if (loading.value) {
        setStepStatus('generate', 'done')
        setStepStatus('review', 'active')
      }
    }, 4000)

    const mdResponse = await generatePromise

    setStepStatus('palette', 'done')
    setStepStatus('generate', 'done')
    setStepStatus('review', 'done')

    generatedMarkdown.value = mdResponse.markdown
    slides.value = mdResponse.slides
    generatedPalette.value = mdResponse.palette || null

    // Étape 4 : Création du HTML
    setStepStatus('render', 'active')

    // L'API fait render + revue UX (avec la palette générée)
    const renderPromise = $fetch('/api/render', {
      method: 'POST',
      body: {
        markdown: generatedMarkdown.value,
        slides: slides.value,
        baseColor: baseColor.value,
        title: title.value || slides.value[0]?.title || 'Présentation',
        apiKey: apiKey.value,
        palette: generatedPalette.value,
        model: selectedModel.value
      }
    })

    // Après 1s, passer à l'étape revue UX
    setTimeout(() => {
      if (loading.value) {
        setStepStatus('render', 'done')
        setStepStatus('ux-review', 'active')
      }
    }, 1000)

    const htmlResponse = await renderPromise

    setStepStatus('render', 'done')
    setStepStatus('ux-review', 'done')

    generatedHtml.value = htmlResponse.html
    generatedUrl.value = htmlResponse.url

    // Étape 5 : Sauvegarde
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
  <div class="min-h-screen bg-muted-50">
    <!-- Header -->
    <header class="bg-white border-b border-muted-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <UIcon name="i-lucide-presentation" class="w-5 h-5 text-white" />
          </div>
          <h1 class="text-xl font-bold text-muted-950">PREZ</h1>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-muted-500 text-sm">{{ user }}</span>
          <UButton variant="ghost" size="sm" color="neutral" @click="logout">
            <UIcon name="i-lucide-log-out" class="w-4 h-4 mr-1" />
            Déconnexion
          </UButton>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="max-w-7xl mx-auto px-6 py-8">
      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Colonne principale : Formulaire + Résultat -->
        <div class="flex-1 min-w-0">
          <!-- Formulaire -->
          <div class="bg-white rounded-xl border border-muted-200 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-muted-100 bg-muted-50/50">
              <h2 class="text-lg font-semibold text-muted-900">Nouvelle présentation</h2>
              <p class="text-sm text-muted-500 mt-0.5">Générez une présentation pédagogique avec l'IA</p>
            </div>

            <form @submit.prevent="generatePresentation" class="p-6 space-y-5">
              <UFormField label="Titre de la présentation" name="title" class="w-full">
                <UInput
                  v-model="title"
                  placeholder="Ex: Gestion des médias WordPress"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Clé API Claude" name="apiKey" hint="Stockée localement" class="w-full">
                <UInput
                  v-model="apiKey"
                  type="password"
                  placeholder="sk-ant-..."
                  required
                  class="w-full"
                />
              </UFormField>

              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Modèle IA" name="model" class="w-full">
                  <USelect
                    v-model="selectedModel"
                    :items="modelOptions"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Couleur accent" name="color" class="w-full">
                  <div class="flex items-center gap-2 w-full">
                    <input
                      type="color"
                      v-model="baseColor"
                      class="w-10 h-10 rounded-lg cursor-pointer border border-muted-200"
                    />
                    <UInput v-model="baseColor" class="flex-1 font-mono text-sm" />
                  </div>
                </UFormField>
              </div>

              <UFormField label="Contenu source" name="prompt" class="w-full">
                <UTextarea
                  v-model="prompt"
                  :rows="8"
                  placeholder="Collez ici le contenu de votre cours ou décrivez la présentation à générer..."
                  required
                  class="w-full"
                />
              </UFormField>

              <UAlert
                v-if="error"
                color="error"
                :title="error"
                variant="subtle"
              />

              <UButton
                type="submit"
                block
                size="lg"
                :loading="loading"
                :disabled="!prompt || !apiKey"
                class="!bg-accent hover:!bg-accent-700"
              >
                <UIcon name="i-lucide-sparkles" class="w-5 h-5 mr-2" />
                {{ loading ? 'Génération en cours...' : 'Générer la présentation' }}
              </UButton>
            </form>
          </div>

          <!-- Résultat (apparaît après génération) -->
          <div v-if="generatedHtml" class="mt-6">
            <div class="bg-white rounded-xl border border-muted-200 shadow-sm overflow-hidden">
              <div class="px-6 py-4 border-b border-muted-100 bg-accent/5 flex items-center justify-between flex-wrap gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h2 class="text-lg font-semibold text-muted-900">Présentation générée</h2>
                    <p class="text-sm text-muted-500">{{ slides?.length || 0 }} slides · {{ title }}</p>
                  </div>
                </div>
                <div class="flex gap-2">
                  <UButton
                    v-if="generatedUrl"
                    as="a"
                    :href="generatedUrl"
                    target="_blank"
                    variant="outline"
                    color="neutral"
                    size="sm"
                  >
                    <UIcon name="i-lucide-external-link" class="w-4 h-4 mr-1" />
                    Ouvrir
                  </UButton>
                  <UButton
                    v-if="generatedUrl"
                    :to="`/editor/${generatedUrl.split('/').pop()}`"
                    variant="outline"
                    color="neutral"
                    size="sm"
                  >
                    <UIcon name="i-lucide-pencil" class="w-4 h-4 mr-1" />
                    Éditer
                  </UButton>
                  <UButton @click="downloadHtml" size="sm" class="!bg-accent hover:!bg-accent-700">
                    <UIcon name="i-lucide-download" class="w-4 h-4 mr-1" />
                    Télécharger
                  </UButton>
                </div>
              </div>

              <div class="p-4">
                <iframe
                  :srcdoc="generatedHtml"
                  class="w-full h-72 rounded-lg border border-muted-200"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar droite : Présentations existantes -->
        <aside v-if="presentations?.length" class="w-full lg:w-80 flex-shrink-0">
          <div class="bg-white rounded-xl border border-muted-200 shadow-sm overflow-hidden lg:sticky lg:top-24">
            <div class="px-4 py-3 border-b border-muted-100 bg-muted-50/50 flex items-center justify-between">
              <h2 class="font-semibold text-muted-900">Présentations</h2>
              <span class="text-xs text-muted-500 bg-muted-100 px-2 py-0.5 rounded-full">
                {{ presentations?.length }}
              </span>
            </div>

            <div class="divide-y divide-muted-100 max-h-[calc(100vh-12rem)] overflow-y-auto">
              <div
                v-for="pres in presentations"
                :key="pres.filename"
                class="p-3 hover:bg-muted-50 transition-colors group"
              >
                <a
                  :href="pres.url"
                  target="_blank"
                  class="block font-medium text-sm text-muted-900 hover:text-accent truncate"
                >
                  {{ pres.title }}
                </a>
                <div class="text-xs text-muted-400 mt-1 flex justify-between items-center">
                  <span>{{ pres.date }}</span>
                  <div class="flex items-center gap-1">
                    <span class="text-muted-300">{{ formatSize(pres.size) }}</span>
                    <UButton
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-pencil"
                      :to="`/editor/${pres.filename}`"
                      class="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-muted-200 bg-white py-6 mt-12">
      <div class="max-w-7xl mx-auto px-6 text-center">
        <p class="text-muted-500 text-sm">
          <span class="text-accent font-semibold">PREZ</span> — Générateur de présentations pédagogiques avec IA
        </p>
      </div>
    </footer>

    <!-- Modal de progression -->
    <UModal v-model:open="showProgressModal" :dismissible="false">
      <template #content>
        <div class="p-6 bg-white rounded-xl">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <UIcon name="i-lucide-sparkles" class="w-6 h-6 text-accent animate-pulse" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-muted-900">Génération en cours</h3>
                <p class="text-sm text-muted-500">L'IA travaille sur votre présentation...</p>
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
              <span class="text-muted-500">Progression</span>
              <span class="text-accent font-semibold">{{ progressPercent }}%</span>
            </div>
            <div class="w-full bg-muted-100 rounded-full h-2">
              <div
                class="bg-accent h-2 rounded-full transition-all duration-500"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>
          </div>

          <!-- Liste des étapes -->
          <div class="space-y-2">
            <div
              v-for="(step, index) in progressSteps"
              :key="step.id"
              class="flex items-center gap-3 p-3 rounded-lg transition-colors"
              :class="{
                'bg-muted-50': step.status === 'pending',
                'bg-accent/5 border border-accent/20': step.status === 'active',
                'bg-green-50': step.status === 'done',
                'bg-red-50': step.status === 'error'
              }"
            >
              <!-- Icône de statut -->
              <div class="w-6 h-6 flex items-center justify-center">
                <UIcon
                  v-if="step.status === 'pending'"
                  name="i-lucide-circle"
                  class="w-5 h-5 text-muted-300"
                />
                <UIcon
                  v-else-if="step.status === 'active'"
                  name="i-lucide-loader-2"
                  class="w-5 h-5 text-accent animate-spin"
                />
                <UIcon
                  v-else-if="step.status === 'done'"
                  name="i-lucide-check-circle"
                  class="w-5 h-5 text-green-600"
                />
                <UIcon
                  v-else-if="step.status === 'error'"
                  name="i-lucide-x-circle"
                  class="w-5 h-5 text-red-600"
                />
              </div>

              <!-- Numéro et label -->
              <div class="flex-1">
                <span
                  class="text-sm font-medium"
                  :class="{
                    'text-muted-400': step.status === 'pending',
                    'text-accent': step.status === 'active',
                    'text-green-700': step.status === 'done',
                    'text-red-700': step.status === 'error'
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

    <!-- Modal d'amélioration -->
    <UModal v-model:open="showImproveModal">
      <template #content>
        <div class="p-6 bg-white rounded-xl">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <UIcon name="i-lucide-pencil" class="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-muted-900">Améliorer la présentation</h3>
              <p class="text-sm text-muted-500">{{ improvingPresentation?.title }}</p>
            </div>
          </div>

          <UFormField label="Instructions de modification" class="mb-4">
            <UTextarea
              v-model="improveInstructions"
              :rows="5"
              placeholder="Ex: Ajoute une slide sur les formats AVIF, corrige l'orthographe, simplifie la slide 3..."
              :disabled="improveLoading"
            />
          </UFormField>

          <UAlert
            v-if="improveError"
            color="error"
            :title="improveError"
            variant="subtle"
            class="mb-4"
          />

          <div class="flex justify-end gap-3">
            <UButton
              variant="ghost"
              color="neutral"
              @click="showImproveModal = false"
              :disabled="improveLoading"
            >
              Annuler
            </UButton>
            <UButton
              :loading="improveLoading"
              :disabled="!improveInstructions.trim() || !apiKey"
              @click="improvePresentation"
              class="!bg-accent hover:!bg-accent-700"
            >
              <UIcon name="i-lucide-sparkles" class="w-4 h-4 mr-1" />
              Améliorer
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
