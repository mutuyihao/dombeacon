export const apiResponse = <T>(
  data: T,
  msg: string = "OK",
  code: number = 0,
) => {
  return { code, msg, data };
};

export const apiError = (
  msg: string,
  code: number = 50000,
  data: any = null,
) => {
  throw createError({
    statusCode: 200, // Always return 200 for logic errors as per requirement (or 500 if critical) but user asked for unifying code in body.
    // Usually Nuxt returning 200 with error body requires manual handling or using return, not throw.
    // If we throw, Nuxt sends JSON error.
    // Let's just return the object if not throwing.
    statusMessage: msg,
    data: { code, msg, data },
  });
};

// Helper for simplified return
export const success = <T>(data: T) => apiResponse(data, "OK", 0);
export const fail = (msg: string, code: number = 50000) => ({
  code,
  msg,
  data: null,
});
