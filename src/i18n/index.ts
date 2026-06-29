import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import de from './locales/de.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import tr from './locales/tr.json';
import it from './locales/it.json';

/** Languages the UI is translated into. The first entry is the ultimate source. */
export const SUPPORTED_LANGUAGES = [
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/** Where the user's manual language choice is remembered between visits. */
export const LANGUAGE_STORAGE_KEY = 'wanderpost.lang';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
      fr: { translation: fr },
      tr: { translation: tr },
      it: { translation: it },
    },
    // English is the widest-reach fallback when a detected language isn't covered.
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    // Treat regional variants (de-DE, en-GB, …) as their base language.
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    detection: {
      // Honour a saved manual choice first, then fall back to the browser locale.
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    interpolation: { escapeValue: false },
    returnNull: false,
    // Resources are bundled, so there's nothing to load asynchronously.
    react: { useSuspense: false },
  });

/** Keep the document's <html lang> in step with the active language. */
function applyHtmlLang(lng: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng.split('-')[0];
  }
}
applyHtmlLang(i18n.language || 'en');
i18n.on('languageChanged', applyHtmlLang);

export default i18n;
