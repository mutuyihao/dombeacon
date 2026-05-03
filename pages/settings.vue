<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <h2 class="text-xl font-semibold">{{ $t('settings.title') }}</h2>

    <div class="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
      <h3 class="font-medium text-text-main mb-4 border-b border-card-border pb-2">{{ $t('settings.notifications') }}</h3>
      <form @submit.prevent="save" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                  <label class="block text-sm font-medium mb-1">{{ $t('settings.targetEmail') }}</label>
                  <input v-model="form.targetEmail" type="email" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg" required>
              </div>

              <div>
                  <label class="block text-sm font-medium mb-1">{{ $t('settings.smtpHost') }}</label>
                  <input v-model="form.smtpConfig.host" type="text" placeholder="smtp.gmail.com" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg">
              </div>
              <div>
                  <label class="block text-sm font-medium mb-1">{{ $t('settings.smtpPort') }}</label>
                  <input v-model="form.smtpConfig.port" type="number" placeholder="587" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg">
              </div>

              <div>
                  <label class="block text-sm font-medium mb-1">{{ $t('settings.username') }}</label>
                  <input v-model="form.smtpConfig.user" type="text" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg">
              </div>
               <div>
                  <label class="block text-sm font-medium mb-1">{{ $t('settings.password') }}</label>
                  <input v-model="form.smtpConfig.pass" type="password" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg">
              </div>

               <div class="md:col-span-2">
                  <label class="block text-sm font-medium mb-1">{{ $t('settings.fromEmail') }}</label>
                  <input v-model="form.smtpConfig.from" type="email" placeholder="noreply@domain.com" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg">
              </div>
          </div>

          <div class="border-t border-card-border pt-4 mt-2 grid grid-cols-2 gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="form.instantEnabled" type="checkbox" class="w-4 h-4 text-accent rounded border-gray-300">
                  <span class="text-sm">{{ $t('settings.instantNotification') }}</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="form.dailyEnabled" type="checkbox" class="w-4 h-4 text-accent rounded border-gray-300">
                  <span class="text-sm">{{ $t('settings.dailySummary') }}</span>
              </label>
          </div>

          <div class="flex justify-end pt-4">
              <button type="submit" class="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-medium transition-colors" :disabled="saving">
                  {{ saving ? $t('settings.saving') : $t('settings.saveSettings') }}
              </button>
          </div>
      </form>
    </div>
  </div>
</template>

<script setup>
const { t } = useI18n();
const { data } = await useFetch('/api/notifications/config');
const saving = ref(false);

const form = reactive({
    targetEmail: '',
    instantEnabled: false,
    dailyEnabled: false,
    smtpConfig: {
        host: '',
        port: 587,
        user: '',
        pass: '',
        from: ''
    }
});

// Load init data
watchEffect(() => {
    if (data.value && data.value.data) {
        const d = data.value.data;
        form.targetEmail = d.targetEmail || '';
        form.instantEnabled = d.instantEnabled || false;
        form.dailyEnabled = d.dailyEnabled || false;
        if(d.smtpConfig) {
            form.smtpConfig = { ...form.smtpConfig, ...d.smtpConfig };
        }
    }
});

const save = async () => {
    saving.value = true;
    try {
        await $fetch('/api/notifications/config', { method: 'POST', body: form });
        alert(t('settings.saveSuccess'));
    } catch(e) { alert(t('settings.saveError')); }
    finally { saving.value = false; }
};
</script>
