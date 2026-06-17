import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// True on iPhone/iPad Safari, where there's no beforeinstallprompt event —
// the user must add to the home screen manually via the share sheet.
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

type InstallState = {
  /** Android/desktop: a real install prompt is available to trigger. */
  canPrompt: boolean;
  /** iOS Safari: no prompt event, the user adds to the home screen manually. */
  isIos: boolean;
  /** App is already running as an installed standalone app. */
  installed: boolean;
  /** Trigger the native prompt. Returns the user's choice (or 'unavailable'). */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
};

const InstallContext = createContext<InstallState | null>(null);

// Capturing beforeinstallprompt and the standalone/iOS state in one place lets
// both the auto-banner and the always-available install button share a single
// source of truth — the event only fires once and prompt() works only once.
export function InstallProvider({ children }: { children: ReactNode }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    if (isIosSafari() && !isStandalone()) setIsIos(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!installEvent) return 'unavailable';
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    return outcome;
  }

  return (
    <InstallContext.Provider value={{ canPrompt: !!installEvent, isIos, installed, promptInstall }}>
      {children}
    </InstallContext.Provider>
  );
}

export function useInstall(): InstallState {
  const ctx = useContext(InstallContext);
  if (!ctx) throw new Error('useInstall must be used within an InstallProvider');
  return ctx;
}
