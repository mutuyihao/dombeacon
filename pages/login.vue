<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
    <div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0">
      <div class="absolute inset-0 bg-app-grid opacity-70" />
      <div class="absolute left-1/2 top-[-10rem] h-96 w-96 -translate-x-1/2 rounded-full bg-[var(--app-aura-primary)] blur-3xl" />
      <div class="absolute bottom-[-8rem] right-[-6rem] h-80 w-80 rounded-full bg-[var(--app-aura-secondary)] blur-3xl" />
    </div>

    <div class="relative z-10 w-full max-w-md">
      <div class="glass-panel rounded-[2rem] p-8">
        <!-- Logo -->
        <div class="flex justify-center mb-6">
          <div class="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.5rem] bg-accent text-white shadow-[0_24px_50px_-30px_var(--color-accent)]">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.52),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent_55%)]" />
            <RadarIcon class="relative h-9 w-9" />
          </div>
        </div>

        <!-- Title -->
        <h1 class="mb-2 text-center font-display text-3xl font-semibold text-text-main">
          {{ $t('common.appName') }}
        </h1>
        <p class="mb-8 text-center text-sm text-text-secondary">
          {{ $t('auth.enterPassword') }}
        </p>

        <!-- Error Message -->
        <div
          v-if="error"
          class="mb-4 p-3 bg-status-dropping/10 border border-status-dropping/20 rounded text-sm text-status-dropping"
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
              class="w-full rounded-xl border border-card-border bg-background/70 px-4 py-3 text-text-main focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
              :placeholder="$t('auth.enterPassword')"
              :disabled="loading"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white shadow-[0_18px_36px_-24px_var(--color-accent)] transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
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

    if (response?.code === 0) {
      await navigateTo("/domains");
      return;
    }

    error.value = response?.msg || t("auth.invalidPassword");
  } catch (e) {
    error.value = e?.data?.msg || e?.data?.message || t("auth.invalidPassword");
  } finally {
    loading.value = false;
  }
};
</script>
