export default defineEventHandler(async (event) => {
  deleteCookie(event, "admin_session");
  return { success: true };
});
