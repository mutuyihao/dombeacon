export default defineNuxtRouteMiddleware(async (to) => {
  // Skip auth check for login page and offline fallback
  if (to.path === "/login" || to.path === "/offline") {
    return;
  }

  // Check auth status
  try {
    const status = await $fetch("/api/auth/status");

    if (status?.code !== 0) {
      return navigateTo("/login");
    }

    if (status.data?.authRequired && !status.data?.authenticated) {
      return navigateTo("/login");
    }
  } catch (error) {
    // If auth check fails, redirect to login
    return navigateTo("/login");
  }
});
