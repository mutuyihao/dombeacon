export default defineEventHandler(async () => {
  try {
    // Lazily opens DB connection (and applies PRAGMAs) as part of readiness.
    useDb();

    return success({
      ok: true,
      now: new Date().toISOString(),
    });
  } catch (e: any) {
    return fail(e.message || "Unhealthy", 50000);
  }
});
