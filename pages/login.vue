<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <div class="w-full max-w-md">
      <div class="bg-card border border-card-border rounded-lg p-8 shadow-sm">
        <!-- Logo -->
        <div class="flex justify-center mb-6">
          <div class="w-16 h-16 rounded-lg bg-accent flex items-center justify-center text-white">
            <RadarIcon class="w-10 h-10" />
          </div>
        </div>

        <!-- Title -->
        <h1 class="text-2xl font-semibold text-center text-text-main mb-2">
          {{ $t('common.appName') }}
        </h1>
        <p class="text-sm text-text-secondary text-center mb-8">
          {{ $t('auth.enterPassword') }}
        </p>

        <!-- Error Message -->
        <div
          v-if="error"
          class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700"
        >
          {{ error }}
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin">
          <div class="mb-6">
            <label for="password" class="block text-sm font-medium text-text-main mb-2">
              {{ $t('auth.password') }}
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              class="w-full px-4 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-white text-text-main"
              :placeholder="$t('auth.enterPassword')"
              :disabled="loading"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-accent hover:bg-accent-hover text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? $t('auth.loggingIn') : $t('auth.login') }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { Radar as RadarIcon } from "lucide-vue-next";

const { t } = useI18n();

definePageMeta({
  layout: false,
});

const password = ref("");
const loading = ref(false);
const error = ref("");

const handleLogin = async () => {
  loading.value = true;
  error.value = "";

  try {
    const response = await $fetch("/api/auth/login", {
      method: "POST",
      body: { password: password.value },
    });

    if (response.success) {
      // Redirect to domains page
      await navigateTo("/domains");
    }
  } catch (e) {
    error.value = e.data?.message || t('auth.invalidPassword');
  } finally {
    loading.value = false;
  }
};
</script>
