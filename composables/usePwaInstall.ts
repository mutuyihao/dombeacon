type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const isStandalone = () => {
  if (!import.meta.client) return false;
  const iosStandalone =
    typeof navigator !== "undefined" &&
    Boolean((navigator as NavigatorWithStandalone).standalone);
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
    if (installed.value) {
      promptEvent.value = null;
      canInstall.value = false;
    }
  };

  const install = async () => {
    if (!import.meta.client) return false;
    if (!promptEvent.value) return false;

    const evt = promptEvent.value;
    let outcome: "accepted" | "dismissed" | undefined;
    try {
      await evt.prompt();
      outcome = (await evt.userChoice).outcome;
    } catch {
      promptEvent.value = null;
      canInstall.value = false;
      refreshInstalled();
      return false;
    }

    promptEvent.value = null;
    canInstall.value = false;
    refreshInstalled();
    return outcome === "accepted" || installed.value;
  };

  return {
    promptEvent,
    canInstall,
    installed,
    refreshInstalled,
    install,
  };
};
