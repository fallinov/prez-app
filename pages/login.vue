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
  <div class="min-h-screen bg-gray-900 flex items-center justify-center p-4">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold text-white">PREZ</h1>
          <p class="text-gray-400 mt-1">Générateur de présentations</p>
        </div>
      </template>

      <form @submit.prevent="handleLogin" class="space-y-4">
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
        >
          Se connecter
        </UButton>
      </form>

      <template #footer>
        <p class="text-center text-sm text-gray-500">
          Accès réservé aux enseignants ESIG
        </p>
      </template>
    </UCard>
  </div>
</template>
