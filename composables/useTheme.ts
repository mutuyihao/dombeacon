type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "theme-mode";

const getSystemTheme = () => {
  if (!import.meta.client) return "light" as const;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
    ? ("dark" as const)
    : ("light" as const);
};

const applyThemeToDom = (mode: ThemeMode) => {
  if (!import.meta.client) return;
  const resolved = mode === "system" ? getSystemTheme() : mode;

  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.classList.toggle("dark", resolved === "dark");

  // Keep the browser UI (address bar) consistent with current theme.
  const themeColor =
    resolved === "dark"
      ? "#071316" // should match dark background token
      : "#EDF5F3"; // should match light background token
  const meta =
    document.querySelector('meta[name="theme-color"]') ||
    document.createElement("meta");
  meta.setAttribute("name", "theme-color");
  meta.setAttribute("content", themeColor);
  if (!meta.parentNode) document.head.appendChild(meta);
};

export const useTheme = () => {
  const mode = useState<ThemeMode>("theme-mode", () => "system");

  const setMode = (m: ThemeMode) => {
    mode.value = m;
    if (!import.meta.client) return;
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
    applyThemeToDom(m);
  };

  const toggle = () => {
    const current = mode.value === "system" ? getSystemTheme() : mode.value;
    setMode(current === "dark" ? "light" : "dark");
  };

  const init = () => {
    if (!import.meta.client) return;
    let stored: ThemeMode | null = null;
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "light" || v === "dark" || v === "system") stored = v;
    } catch {
      stored = null;
    }
    if (stored) mode.value = stored;
    applyThemeToDom(mode.value);
  };

  const resolved = computed(() =>
    mode.value === "system" ? getSystemTheme() : mode.value,
  );

  return {
    mode,
    resolved,
    setMode,
    toggle,
    init,
  };
};
