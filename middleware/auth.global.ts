export default defineNuxtRouteMiddleware(async (to) => {
  // Skip auth check for login page
  if (to.path === "/login") {
    return;
  }

  // Check auth status
  try {
    const status = await $fetch("/api/auth/status");

    if (status.authRequired && !status.authenticated) {
      return navigateTo("/login");
    }
  } catch (error) {
    // If auth check fails, redirect to login
    return navigateTo("/login");
  }
});
