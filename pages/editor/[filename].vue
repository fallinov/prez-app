<script setup lang="ts">
import type { Slide } from '~/types'

interface GeneratedPalette {
  accent: string
  accentContrast: string
  accentLight: string
  accentDark: string
  textHighlight: string
}

interface PresentationMetadata {
  title: string
  markdown: string
  baseColor: string
  palette: GeneratedPalette | null
  model: string
  createdAt: string
}

interface PresentationData {
  metadata: PresentationMetadata
  html: string
  slides: Slide[]
}

const route = useRoute()
const filename = computed(() => route.params.filename as string)

// États
const loading = ref(true)
const error = ref('')
const presentation = ref<PresentationData | null>(null)
const currentSlideIndex = ref(-1) // -1 = vue d'ensemble
const apiKey = ref('')
const slidePreviewHtml = ref('')

// États du prompt
const instructions = ref('')
const improving = ref(false)
const improveError = ref('')

// États de la palette (édition locale)
const editedPalette = ref<GeneratedPalette | null>(null)
const regeneratingPalette = ref(false)

// Mode vue d'ensemble
const isOverviewMode = computed(() => currentSlideIndex.value === -1)

// Modèles disponibles
const modelOptions = [
  { label: 'Claude Sonnet 4 (Recommandé)', value: 'claude-sonnet-4-20250514' },
  { label: 'Claude Opus 4 (Plus puissant)', value: 'claude-opus-4-20250514' },
  { label: 'Claude Haiku 3.5 (Rapide)', value: 'claude-3-5-haiku-20241022' }
]
const selectedModel = ref('claude-sonnet-4-20250514')

// Slide courante
const currentSlide = computed(() => {
  if (currentSlideIndex.value < 0) return null
  return presentation.value?.slides[currentSlideIndex.value]
})

// Placeholder dynamique pour le prompt
const promptPlaceholder = computed(() => {
  if (isOverviewMode.value) {
    return 'Modifier toute la présentation : "Ajoute une slide sur...", "Corrige l\'orthographe", "Simplifie le contenu"...'
  }
  const slideNum = currentSlideIndex.value + 1
  const slideTitle = currentSlide.value?.title || 'Sans titre'
  return `Modifier le slide ${slideNum} : "${slideTitle}"...`
})

// Labels des couleurs de la palette
const paletteLabels: Record<keyof GeneratedPalette, string> = {
  accent: 'Couleur principale',
  accentContrast: 'Texte sur accent',
  accentLight: 'Accent clair',
  accentDark: 'Accent foncé',
  textHighlight: 'Mise en valeur'
}

// Charger la présentation
async function loadPresentation() {
  loading.value = true
  error.value = ''

  try {
    const data = await $fetch<PresentationData>(`/api/presentations/${filename.value}`)
    presentation.value = data

    // Copier la palette pour l'édition
    if (data.metadata.palette) {
      editedPalette.value = { ...data.metadata.palette }
    }

    // Utiliser le modèle sauvegardé si disponible
    if (data.metadata.model) {
      selectedModel.value = data.metadata.model
    }
  } catch (e: any) {
    error.value = e.data?.message || 'Erreur lors du chargement'
    console.error(e)
  } finally {
    loading.value = false
  }
}

// Générer l'aperçu HTML d'un slide
async function generateSlidePreview() {
  if (!presentation.value || !currentSlide.value) {
    slidePreviewHtml.value = ''
    return
  }

  try {
    const response = await $fetch('/api/preview-slide', {
      method: 'POST',
      body: {
        slide: currentSlide.value,
        palette: editedPalette.value || presentation.value.metadata.palette,
        baseColor: presentation.value.metadata.baseColor,
        slideIndex: currentSlideIndex.value  // Index réel pour le bon style (hero vs content)
      }
    })
    slidePreviewHtml.value = response.html
  } catch (e: any) {
    // Fallback : utiliser le HTML complet
    slidePreviewHtml.value = presentation.value.html
    console.warn('Preview slide fallback:', e)
  }
}

// Navigation entre slides
function selectSlide(index: number) {
  const maxIndex = (presentation.value?.slides.length || 0) - 1
  if (index >= -1 && index <= maxIndex) {
    currentSlideIndex.value = index
    if (index >= 0) {
      generateSlidePreview()
    }
  }
}

function previousSlide() {
  selectSlide(currentSlideIndex.value - 1)
}

function nextSlide() {
  selectSlide(currentSlideIndex.value + 1)
}

// Améliorer le slide courant ou toute la présentation
async function improve() {
  if (!instructions.value.trim() || !apiKey.value || !presentation.value) {
    improveError.value = 'Instructions et clé API requises'
    return
  }

  improving.value = true
  improveError.value = ''

  try {
    if (isOverviewMode.value) {
      // Amélioration globale
      const improveResponse = await $fetch('/api/improve', {
        method: 'POST',
        body: {
          filename: filename.value,
          instructions: instructions.value,
          apiKey: apiKey.value,
          model: selectedModel.value
        }
      })

      // Re-render avec la palette actuelle
      const renderResponse = await $fetch('/api/render', {
        method: 'POST',
        body: {
          markdown: improveResponse.markdown,
          slides: improveResponse.slides,
          baseColor: improveResponse.baseColor,
          title: improveResponse.title,
          apiKey: apiKey.value,
          palette: editedPalette.value || improveResponse.palette,
          model: improveResponse.model
        }
      })

      // Mettre à jour les données
      presentation.value.metadata.markdown = improveResponse.markdown
      presentation.value.slides = improveResponse.slides
      presentation.value.html = renderResponse.html

    } else {
      // Amélioration d'un slide spécifique
      const response = await $fetch('/api/improve-slide', {
        method: 'POST',
        body: {
          filename: filename.value,
          slideIndex: currentSlideIndex.value,
          instructions: instructions.value,
          apiKey: apiKey.value,
          model: selectedModel.value
        }
      })

      // Mettre à jour les données
      presentation.value.metadata.markdown = response.markdown
      presentation.value.slides = response.slides
      presentation.value.html = response.html

      // Régénérer l'aperçu
      await generateSlidePreview()
    }

    // Vider le prompt
    instructions.value = ''

  } catch (e: any) {
    improveError.value = e.data?.message || 'Erreur lors de l\'amélioration'
    console.error(e)
  } finally {
    improving.value = false
  }
}

// Régénérer la palette de couleurs
async function regeneratePalette() {
  if (!apiKey.value || !presentation.value) {
    improveError.value = 'Clé API requise'
    return
  }

  regeneratingPalette.value = true
  improveError.value = ''

  try {
    // Utiliser la couleur accent éditée comme nouvelle base, sinon la couleur de base originale
    const baseColorForRegeneration = editedPalette.value?.accent || presentation.value.metadata.baseColor

    const response = await $fetch('/api/regenerate-palette', {
      method: 'POST',
      body: {
        filename: filename.value,
        baseColor: baseColorForRegeneration,
        apiKey: apiKey.value
      }
    })

    // Mettre à jour la palette et la couleur de base
    editedPalette.value = response.palette
    presentation.value.metadata.palette = response.palette
    presentation.value.metadata.baseColor = baseColorForRegeneration
    presentation.value.html = response.html

  } catch (e: any) {
    improveError.value = e.data?.message || 'Erreur lors de la régénération'
    console.error(e)
  } finally {
    regeneratingPalette.value = false
  }
}

// Appliquer les modifications de palette
async function applyPaletteChanges() {
  if (!editedPalette.value || !presentation.value) return

  improving.value = true
  improveError.value = ''

  try {
    // Mettre à jour la palette via l'API dédiée
    const response = await $fetch('/api/update-palette', {
      method: 'POST',
      body: {
        filename: filename.value,
        palette: editedPalette.value
      }
    })

    // Mettre à jour les données locales
    presentation.value.metadata.palette = { ...editedPalette.value }
    presentation.value.html = response.html

  } catch (e: any) {
    improveError.value = e.data?.message || 'Erreur lors de l\'application'
    console.error(e)
  } finally {
    improving.value = false
  }
}

// Vérifier si la palette a été modifiée
const paletteChanged = computed(() => {
  if (!editedPalette.value || !presentation.value?.metadata.palette) return false
  const original = presentation.value.metadata.palette
  return Object.keys(editedPalette.value).some(
    key => editedPalette.value![key as keyof GeneratedPalette] !== original[key as keyof GeneratedPalette]
  )
})

// Raccourcis clavier
function handleKeydown(e: KeyboardEvent) {
  // Ignorer si on est dans un champ de saisie
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    // Enter dans le textarea envoie le prompt (avec Cmd/Ctrl)
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      improve()
    }
    return
  }

  switch (e.key) {
    case 'ArrowUp':
    case 'ArrowLeft':
      e.preventDefault()
      previousSlide()
      break
    case 'ArrowDown':
    case 'ArrowRight':
      e.preventDefault()
      nextSlide()
      break
    case 'Escape':
      navigateTo('/')
      break
  }
}

// Initialisation
onMounted(() => {
  // Charger la clé API
  const savedApiKey = localStorage.getItem('prez-api-key')
  if (savedApiKey) {
    apiKey.value = savedApiKey
  }

  // Charger la présentation
  loadPresentation()

  // Ajouter les raccourcis clavier
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Sauvegarder la clé API quand elle change
watch(apiKey, (newKey) => {
  if (newKey) {
    localStorage.setItem('prez-api-key', newKey)
  }
})
</script>

<template>
  <div class="h-screen bg-muted-50 flex flex-col overflow-hidden">
    <!-- Header -->
    <header class="bg-white border-b border-muted-200 px-4 py-2 flex-shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <UButton variant="ghost" color="neutral" icon="i-lucide-arrow-left" @click="navigateTo('/')">
            Retour
          </UButton>
          <div class="h-6 w-px bg-muted-200" />
          <h1 class="text-lg font-semibold text-muted-900">
            {{ presentation?.metadata.title || 'Chargement...' }}
          </h1>
        </div>
        <div class="flex items-center gap-3">
          <UButton
            v-if="presentation"
            as="a"
            :href="`/generated/${filename}`"
            target="_blank"
            variant="outline"
            color="neutral"
            size="sm"
          >
            <UIcon name="i-lucide-external-link" class="w-4 h-4 mr-1" />
            Voir en plein écran
          </UButton>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 text-accent animate-spin mb-4" />
        <p class="text-muted-500">Chargement de la présentation...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center p-6">
      <UAlert color="error" :title="error" class="max-w-md">
        <template #actions>
          <UButton variant="outline" size="sm" @click="navigateTo('/')">
            Retour à l'accueil
          </UButton>
        </template>
      </UAlert>
    </div>

    <!-- Editor Layout -->
    <div v-else-if="presentation" class="flex-1 flex overflow-hidden">
      <!-- Sidebar : Liste des slides -->
      <aside class="w-64 bg-white border-r border-muted-200 flex flex-col overflow-hidden">
        <div class="p-3 border-b border-muted-100">
          <h2 class="text-sm font-medium text-muted-600">
            Slides ({{ presentation.slides.length }})
          </h2>
        </div>
        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          <!-- Vue d'ensemble (slide 0) -->
          <button
            @click="selectSlide(-1)"
            class="w-full text-left p-3 rounded-lg transition-colors"
            :class="[
              isOverviewMode
                ? 'bg-accent/10 border border-accent/30'
                : 'bg-muted-50 hover:bg-muted-100 border border-transparent'
            ]"
          >
            <div class="flex items-start gap-2">
              <span
                class="text-xs font-medium px-1.5 py-0.5 rounded"
                :class="[
                  isOverviewMode
                    ? 'bg-accent text-white'
                    : 'bg-muted-200 text-muted-500'
                ]"
              >
                <UIcon name="i-lucide-settings" class="w-3 h-3" />
              </span>
              <div class="flex-1 min-w-0">
                <div
                  class="font-medium text-sm"
                  :class="isOverviewMode ? 'text-accent' : 'text-muted-700'"
                >
                  Vue d'ensemble
                </div>
                <div class="text-xs text-muted-400 mt-1">
                  Palette, paramètres, prompt global
                </div>
              </div>
            </div>
          </button>

          <!-- Séparateur -->
          <div class="border-t border-muted-100 my-2" />

          <!-- Liste des slides -->
          <button
            v-for="(slide, index) in presentation.slides"
            :key="index"
            @click="selectSlide(index)"
            class="w-full text-left p-3 rounded-lg transition-colors"
            :class="[
              currentSlideIndex === index
                ? 'bg-accent/10 border border-accent/30'
                : 'bg-muted-50 hover:bg-muted-100 border border-transparent'
            ]"
          >
            <div class="flex items-start gap-2">
              <span
                class="text-xs font-medium px-1.5 py-0.5 rounded"
                :class="[
                  currentSlideIndex === index
                    ? 'bg-accent text-white'
                    : 'bg-muted-200 text-muted-500'
                ]"
              >
                {{ index + 1 }}
              </span>
              <div class="flex-1 min-w-0">
                <div
                  class="font-medium text-sm truncate"
                  :class="currentSlideIndex === index ? 'text-accent' : 'text-muted-700'"
                >
                  {{ slide.title }}
                </div>
                <div class="text-xs text-muted-400 mt-1 line-clamp-2">
                  {{ slide.preview }}
                </div>
              </div>
            </div>
          </button>
        </div>
        <!-- Navigation hint -->
        <div class="p-3 border-t border-muted-100 text-xs text-muted-400">
          <div class="flex items-center gap-2">
            <kbd class="px-1.5 py-0.5 bg-muted-100 rounded text-muted-500">↑</kbd>
            <kbd class="px-1.5 py-0.5 bg-muted-100 rounded text-muted-500">↓</kbd>
            <span>Navigation</span>
          </div>
        </div>
      </aside>

      <!-- Main : Preview ou Vue d'ensemble -->
      <main class="flex-1 flex flex-col overflow-hidden min-h-0">
        <!-- Vue d'ensemble -->
        <div v-if="isOverviewMode" class="flex-1 p-6 overflow-y-auto min-h-0">
          <div class="max-w-2xl mx-auto space-y-6">
            <!-- Titre de la présentation -->
            <div>
              <h2 class="text-xl font-semibold text-muted-900 mb-2">
                {{ presentation.metadata.title }}
              </h2>
              <p class="text-muted-500 text-sm">
                {{ presentation.slides.length }} slides · Créée le {{ new Date(presentation.metadata.createdAt).toLocaleDateString('fr-FR') }}
              </p>
            </div>

            <!-- Palette de couleurs -->
            <div class="bg-white rounded-xl border border-muted-200 p-5">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-muted-900">Palette de couleurs</h3>
                <div class="flex gap-2">
                  <UButton
                    v-if="paletteChanged"
                    size="sm"
                    :loading="improving"
                    @click="applyPaletteChanges"
                    class="!bg-accent hover:!bg-accent-700"
                  >
                    Appliquer
                  </UButton>
                  <UButton
                    size="sm"
                    variant="outline"
                    color="neutral"
                    :loading="regeneratingPalette"
                    :disabled="!apiKey"
                    @click="regeneratePalette"
                  >
                    <UIcon name="i-lucide-refresh-cw" class="w-4 h-4 mr-1" />
                    Régénérer
                  </UButton>
                </div>
              </div>

              <div v-if="editedPalette" class="grid grid-cols-2 gap-4">
                <div
                  v-for="(color, key) in editedPalette"
                  :key="key"
                  class="flex items-center gap-3"
                >
                  <input
                    type="color"
                    v-model="editedPalette[key]"
                    class="w-10 h-10 rounded-lg cursor-pointer border border-muted-200"
                  />
                  <div class="flex-1">
                    <div class="text-sm font-medium text-muted-700">
                      {{ paletteLabels[key] }}
                    </div>
                    <div class="text-xs text-muted-400 font-mono">
                      {{ color }}
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="text-muted-500 text-sm">
                Aucune palette générée. Cliquez sur "Régénérer" pour en créer une.
              </div>
            </div>

            <!-- Aperçu des couleurs -->
            <div v-if="editedPalette" class="bg-white rounded-xl border border-muted-200 p-5">
              <h3 class="text-sm font-medium text-muted-600 mb-3">Aperçu</h3>
              <div class="flex gap-2">
                <div
                  v-for="(color, key) in editedPalette"
                  :key="key"
                  class="flex-1 h-12 rounded-lg flex items-center justify-center text-xs font-medium shadow-sm"
                  :style="{
                    backgroundColor: color,
                    color: key === 'accentContrast' ? editedPalette.accent : editedPalette.accentContrast
                  }"
                >
                  {{ key.replace('accent', '').replace('text', '') || 'Accent' }}
                </div>
              </div>
            </div>

            <!-- Infos supplémentaires -->
            <div class="bg-white rounded-xl border border-muted-200 p-5">
              <h3 class="text-sm font-medium text-muted-600 mb-3">Informations</h3>
              <dl class="space-y-3 text-sm">
                <div class="flex justify-between items-center">
                  <dt class="text-muted-500">Couleur de base</dt>
                  <dd class="text-muted-700 flex items-center gap-2">
                    <span
                      class="w-5 h-5 rounded-md shadow-sm border border-muted-200"
                      :style="{ backgroundColor: presentation.metadata.baseColor }"
                    />
                    <span class="font-mono text-xs">{{ presentation.metadata.baseColor }}</span>
                  </dd>
                </div>
                <div class="flex justify-between items-center">
                  <dt class="text-muted-500">Modèle IA</dt>
                  <dd class="text-muted-700 text-xs bg-muted-100 px-2 py-1 rounded">{{ presentation.metadata.model }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <!-- Preview du slide courant -->
        <div v-else class="flex-1 p-3 min-h-0">
          <div class="h-full bg-muted-900 rounded-xl border border-muted-200 overflow-hidden shadow-sm">
            <iframe
              v-if="slidePreviewHtml"
              :srcdoc="slidePreviewHtml"
              class="w-full h-full"
              sandbox="allow-scripts"
            />
            <div v-else class="flex items-center justify-center h-full text-muted-400">
              <UIcon name="i-lucide-image" class="w-12 h-12" />
            </div>
          </div>
        </div>

        <!-- Zone de prompt -->
        <div class="bg-white border-t border-muted-200 px-4 py-3 flex-shrink-0">
          <div class="flex gap-3">
            <div class="flex-1">
              <UTextarea
                v-model="instructions"
                :rows="2"
                :placeholder="promptPlaceholder"
                :disabled="improving"
                class="w-full"
                @keydown.meta.enter="improve"
                @keydown.ctrl.enter="improve"
              />
              <div class="flex items-center justify-between mt-2">
                <div class="text-xs text-muted-400">
                  <span v-if="improving">Amélioration en cours...</span>
                  <span v-else-if="isOverviewMode">Prompt global · ⌘/Ctrl + Enter pour envoyer</span>
                  <span v-else>Slide {{ currentSlideIndex + 1 }} · ⌘/Ctrl + Enter pour envoyer</span>
                </div>
                <div class="flex items-center gap-2">
                  <USelect
                    v-model="selectedModel"
                    :items="modelOptions"
                    size="xs"
                    class="w-48"
                  />
                  <UInput
                    v-model="apiKey"
                    type="password"
                    placeholder="Clé API"
                    size="xs"
                    class="w-32"
                  />
                </div>
              </div>
            </div>
            <UButton
              :loading="improving"
              :disabled="!instructions.trim() || !apiKey"
              @click="improve"
              class="self-start !bg-accent hover:!bg-accent-700"
            >
              <UIcon name="i-lucide-sparkles" class="w-4 h-4 mr-1" />
              {{ isOverviewMode ? 'Améliorer tout' : 'Améliorer' }}
            </UButton>
          </div>

          <UAlert
            v-if="improveError"
            color="error"
            :title="improveError"
            variant="subtle"
            class="mt-3"
          />
        </div>
      </main>
    </div>
  </div>
</template>
