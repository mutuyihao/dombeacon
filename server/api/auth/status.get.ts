export default defineEventHandler(async (event) => {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return {
      authRequired: false,
      authenticated: true,
    };
  }

  const session = getCookie(event, "admin_session");

  return {
    authRequired: true,
    authenticated: session === adminPassword,
  };
});
