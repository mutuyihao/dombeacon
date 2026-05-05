/**
 * Theme bootstrap:
 * - Apply persisted theme mode on first client render
 * - Keep in sync with system theme changes when mode=system
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return;

  const { mode, init } = useTheme();
  init();

  const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (!mql) return;

  const onChange = () => {
    if (mode.value !== "system") return;
    // Re-apply to update resolved theme + meta theme-color.
    init();
  };

  try {
    mql.addEventListener("change", onChange);
  } catch {
    // Safari < 14
    // @ts-ignore
    mql.addListener(onChange);
  }
});
