/**
 * Returns the VAPID public key so the client can call
 * `pushManager.subscribe({ applicationServerKey })`.
 *
 * If the server has no VAPID key configured, returns an empty string and a
 * `configured: false` flag so the UI can hide the push toggle gracefully.
 */
export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const publicKey = config.public.vapidPublicKey || "";
  const configured = Boolean(
    publicKey && config.vapidPrivateKey && config.vapidSubject,
  );
  return success({
    publicKey,
    configured,
  });
});
