<script setup lang="ts">
definePageMeta({
  layout: false
})

const email = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''

  try {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value }
    })

    if (response.success) {
      // Stocker l'email en session côté client
      sessionStorage.setItem('prez-user', email.value)
      navigateTo('/')
    }
  } catch (e: any) {
    error.value = e.data?.message || 'Email non autorisé'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-muted-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo et titre -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <UIcon name="i-lucide-presentation" class="w-9 h-9 text-white" />
        </div>
        <h1 class="text-3xl font-bold text-muted-950">PREZ</h1>
        <p class="text-muted-500 mt-2">Générateur de présentations pédagogiques</p>
      </div>

      <!-- Card de connexion -->
      <div class="bg-white rounded-2xl border border-muted-200 shadow-sm overflow-hidden">
        <form @submit.prevent="handleLogin" class="p-6 space-y-5">
          <UFormField label="Email" name="email">
            <UInput
              v-model="email"
              type="email"
              placeholder="votre@email.ch"
              required
              size="lg"
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
            class="!bg-accent hover:!bg-accent-700"
          >
            <UIcon name="i-lucide-log-in" class="w-5 h-5 mr-2" />
            Se connecter
          </UButton>
        </form>

        <div class="px-6 py-4 bg-muted-50 border-t border-muted-100">
          <p class="text-center text-sm text-muted-500">
            Accès réservé aux enseignants ESIG
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
