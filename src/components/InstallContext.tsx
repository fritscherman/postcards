import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// The kind of device/browser the visitor is on. We use this to show tailored,
// step-by-step install instructions — there's no single "install" gesture that
// works everywhere, so we have to spell out the right one for each platform.
export type InstallPlatform =
  | 'ios' // iPhone / iPad Safari (share sheet is at the BOTTOM → "Zum Home-Bildschirm")
  | 'ios-chrome' // iPhone / iPad Chrome/Edge/Firefox (share sits at the TOP / in the ⋮ menu)
  | 'android' // Android Chrome/Samsung (usually a real prompt, else the menu)
  | 'desktop-chromium' // Chrome / Edge / Brave on a computer (address-bar icon)
  | 'desktop-safari' // Safari 17+ on a Mac ("Zum Dock hinzufügen")
  | 'desktop-firefox' // Firefox — no native install, we explain the workaround
  | 'other'; // anything else — fall back to a generic hint

function isIosDevice(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// True on iPhone/iPad Safari, where there's no beforeinstallprompt event —
// the user must add to the home screen manually via the share sheet.
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const webkit = /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIosDevice() && webkit;
}

function detectPlatform(): InstallPlatform {
  const ua = navigator.userAgent;
  if (isIosDevice()) {
    // All iOS browsers use WebKit and "Add to Home Screen", but Chrome/Edge/
    // Firefox put the share button at the top (or in the ⋮ menu), not bottom.
    return /CriOS|FxiOS|EdgiOS/.test(ua) ? 'ios-chrome' : 'ios';
  }
  if (/Android/.test(ua)) return 'android';
  if (/Firefox\//.test(ua)) return 'desktop-firefox';
  if (/Edg\//.test(ua) || /OPR\//.test(ua) || /Chrome\//.test(ua) || /Chromium/.test(ua)) return 'desktop-chromium';
  if (/Safari\//.test(ua) && /Macintosh/.test(ua)) return 'desktop-safari';
  return 'other';
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
  /** Best guess at the device/browser, used to pick the right instructions. */
  platform: InstallPlatform;
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
  const [platform, setPlatform] = useState<InstallPlatform>('other');

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
    setPlatform(detectPlatform());

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
    <InstallContext.Provider value={{ canPrompt: !!installEvent, isIos, platform, installed, promptInstall }}>
      {children}
    </InstallContext.Provider>
  );
}

export function useInstall(): InstallState {
  const ctx = useContext(InstallContext);
  if (!ctx) throw new Error('useInstall must be used within an InstallProvider');
  return ctx;
}
