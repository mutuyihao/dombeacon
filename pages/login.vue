<template>
  <div class="relative flex min-h-screen items-center justify-center bg-background px-4">
    <div class="relative w-full max-w-sm">
      <div class="mb-10 flex flex-col items-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white">
          <RadarIcon class="h-6 w-6" />
        </div>
        <p class="eyebrow mt-6">Sign in</p>
        <h1 class="headline-display mt-2 text-3xl">{{ $t('common.appName') }}</h1>
        <p class="mt-2 text-center text-sm text-text-secondary">{{ $t('auth.enterPassword') }}</p>
      </div>

      <div v-if="error" class="mb-6 surface-flat p-3 text-sm text-status-dropping">
        {{ error }}
      </div>

      <form @submit.prevent="handleLogin" class="space-y-8">
        <div>
          <label for="password" class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
            {{ $t('auth.password') }}
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="input-bare"
            :placeholder="$t('auth.enterPassword')"
            :disabled="loading"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="btn-primary w-full justify-center disabled:opacity-50"
        >
          {{ loading ? $t('auth.loggingIn') : $t('auth.login') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Radar as RadarIcon } from 'lucide-vue-next';

const { t } = useI18n();

definePageMeta({
  layout: false,
});

const password = ref('');
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  loading.value = true;
  error.value = '';

  try {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { password: password.value },
    });

    if (response?.code === 0) {
      await navigateTo('/domains');
      return;
    }

    error.value = response?.msg || t('auth.invalidPassword');
  } catch (e) {
    error.value = e?.data?.msg || e?.data?.message || t('auth.invalidPassword');
  } finally {
    loading.value = false;
  }
};
</script>
