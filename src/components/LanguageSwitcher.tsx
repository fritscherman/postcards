import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n';

/**
 * Compact language picker for the app bar. The starting language is auto-detected
 * from the browser (see src/i18n); this lets the user override that choice, and
 * the pick is remembered for next time.
 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  // Normalise a regional locale (de-DE) down to the base language we support.
  const current = i18n.language?.split('-')[0] ?? 'en';

  return (
    <label className="lang-switcher" title={t('language.label')}>
      <Languages size={16} aria-hidden="true" />
      <span className="visually-hidden">{t('language.label')}</span>
      <select
        className="lang-select"
        value={current}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        aria-label={t('language.label')}
      >
        {SUPPORTED_LANGUAGES.map((lng) => (
          <option key={lng.code} value={lng.code}>
            {lng.flag} {lng.label}
          </option>
        ))}
      </select>
    </label>
  );
}
