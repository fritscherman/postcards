// Server-side translations for messages that are delivered to a user
// out-of-band (Web Push notifications and invite emails). These can't be
// rendered by the recipient's browser, so the server localises them itself
// using each user's stored language (see the `lang` column on users).
//
// API error responses are NOT handled here — those carry a stable `code` and
// are translated in the frontend (src/i18n) in the caller's current language.

export const SUPPORTED_LANGS = ['de', 'en', 'fr', 'tr', 'it'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];
export const FALLBACK_LANG: Lang = 'en';

/** Narrow an arbitrary string (header/body/db value) to a supported language. */
export function normLang(value: unknown): Lang {
  const base = String(value ?? '').trim().toLowerCase().split('-')[0];
  return (SUPPORTED_LANGS as readonly string[]).includes(base) ? (base as Lang) : FALLBACK_LANG;
}

type Dict = Record<string, string>;

const MESSAGES: Record<Lang, Dict> = {
  de: {
    'push.newPostcard.title': '📬 Neue Postkarte',
    'push.newPostcard.body': '{{name}} hat dir eine Postkarte geschickt.',
    'push.liked.title': '❤️ Postkarte gefällt',
    'push.liked.body': '{{name}} gefällt deine Postkarte.',
    'push.introduced.title': '🤝 Neue Bekanntschaft',
    'push.introduced.body': '{{actor}} hat dich mit {{other}} bekannt gemacht.',
    'email.invite.subject': '{{inviter}} lädt dich zu Wanderpost ein ✉️',
    'email.invite.intro': '{{inviter}} möchte dir virtuelle Postkarten schicken.',
    'email.invite.join': 'Jetzt beitreten',
    'email.invite.copy': 'Oder kopiere diesen Link: {{link}}',
  },
  en: {
    'push.newPostcard.title': '📬 New postcard',
    'push.newPostcard.body': '{{name}} sent you a postcard.',
    'push.liked.title': '❤️ Postcard liked',
    'push.liked.body': '{{name}} likes your postcard.',
    'push.introduced.title': '🤝 New connection',
    'push.introduced.body': '{{actor}} introduced you to {{other}}.',
    'email.invite.subject': '{{inviter}} invites you to Wanderpost ✉️',
    'email.invite.intro': '{{inviter}} would like to send you virtual postcards.',
    'email.invite.join': 'Join now',
    'email.invite.copy': 'Or copy this link: {{link}}',
  },
  fr: {
    'push.newPostcard.title': '📬 Nouvelle carte postale',
    'push.newPostcard.body': '{{name}} t’a envoyé une carte postale.',
    'push.liked.title': '❤️ Carte postale aimée',
    'push.liked.body': '{{name}} aime ta carte postale.',
    'push.introduced.title': '🤝 Nouvelle rencontre',
    'push.introduced.body': '{{actor}} t’a présenté à {{other}}.',
    'email.invite.subject': '{{inviter}} t’invite sur Wanderpost ✉️',
    'email.invite.intro': '{{inviter}} aimerait t’envoyer des cartes postales virtuelles.',
    'email.invite.join': 'Rejoindre maintenant',
    'email.invite.copy': 'Ou copie ce lien : {{link}}',
  },
  tr: {
    'push.newPostcard.title': '📬 Yeni kartpostal',
    'push.newPostcard.body': '{{name}} sana bir kartpostal gönderdi.',
    'push.liked.title': '❤️ Kartpostal beğenildi',
    'push.liked.body': '{{name}} kartpostalını beğendi.',
    'push.introduced.title': '🤝 Yeni tanışma',
    'push.introduced.body': '{{actor}} seni {{other}} ile tanıştırdı.',
    'email.invite.subject': '{{inviter}} seni Wanderpost’a davet ediyor ✉️',
    'email.invite.intro': '{{inviter}} sana sanal kartpostallar göndermek istiyor.',
    'email.invite.join': 'Hemen katıl',
    'email.invite.copy': 'Ya da bu bağlantıyı kopyala: {{link}}',
  },
  it: {
    'push.newPostcard.title': '📬 Nuova cartolina',
    'push.newPostcard.body': '{{name}} ti ha inviato una cartolina.',
    'push.liked.title': '❤️ Cartolina apprezzata',
    'push.liked.body': '{{name}} ha messo mi piace alla tua cartolina.',
    'push.introduced.title': '🤝 Nuova conoscenza',
    'push.introduced.body': '{{actor}} ti ha presentato a {{other}}.',
    'email.invite.subject': '{{inviter}} ti invita su Wanderpost ✉️',
    'email.invite.intro': '{{inviter}} vorrebbe inviarti cartoline virtuali.',
    'email.invite.join': 'Unisciti ora',
    'email.invite.copy': 'Oppure copia questo link: {{link}}',
  },
};

/** Translate a key into `lang`, interpolating {{placeholders}} from `params`. */
export function t(lang: Lang, key: string, params: Record<string, string | number> = {}): string {
  const template = MESSAGES[lang]?.[key] ?? MESSAGES[FALLBACK_LANG][key] ?? key;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) =>
    name in params ? String(params[name]) : `{{${name}}}`,
  );
}
