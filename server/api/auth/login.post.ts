export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { password } = body;

  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw createError({
      statusCode: 400,
      message: "Authentication is not configured",
    });
  }

  if (password !== adminPassword) {
    throw createError({
      statusCode: 401,
      message: "Invalid password",
    });
  }

  // Set session cookie
  setCookie(event, "admin_session", adminPassword, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return { success: true };
});
