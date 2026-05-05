type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const isStandalone = () => {
  if (!import.meta.client) return false;
  // iOS Safari uses navigator.standalone
  // @ts-ignore
  const iosStandalone = typeof navigator !== "undefined" && navigator.standalone;
  const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)")
    ?.matches;
  return Boolean(iosStandalone || displayModeStandalone);
};

export const usePwaInstall = () => {
  const promptEvent = useState<BeforeInstallPromptEvent | null>(
    "pwa-install-prompt",
    () => null,
  );
  const canInstall = useState<boolean>("pwa-can-install", () => false);
  const installed = useState<boolean>("pwa-installed", () => false);

  const refreshInstalled = () => {
    installed.value = isStandalone();
  };

  const install = async () => {
    if (!import.meta.client) return false;
    if (!promptEvent.value) return false;

    const evt = promptEvent.value;
    await evt.prompt();
    try {
      await evt.userChoice;
    } catch {
      /* ignore */
    }

    promptEvent.value = null;
    canInstall.value = false;
    refreshInstalled();
    return true;
  };

  return {
    promptEvent,
    canInstall,
    installed,
    refreshInstalled,
    install,
  };
};
