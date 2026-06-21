// Thin wrapper around the browser's Contact Picker API (navigator.contacts).
// It only exists on a few browsers — notably Chrome/Edge on Android — and always
// goes through a native picker, so the page never sees the full address book,
// only the entries the user explicitly chooses. Everywhere else we degrade
// gracefully and the calling UI simply hides the "pick from contacts" option.

export interface PickedContact {
  name?: string;
  email?: string;
}

interface ContactsManager {
  select: (
    props: string[],
    opts?: { multiple?: boolean },
  ) => Promise<Array<{ name?: string[]; email?: string[] }>>;
  getProperties?: () => Promise<string[]>;
}

function manager(): ContactsManager | null {
  const nav = navigator as Navigator & { contacts?: ContactsManager };
  return typeof navigator !== 'undefined' && nav.contacts && 'ContactsManager' in window
    ? nav.contacts
    : null;
}

/** True when this browser can show a native contact picker. */
export const contactsSupported = (): boolean => manager() !== null;

/**
 * Open the native contact picker and return the chosen contact's name + email.
 * Resolves to null if the user cancels, the API is unavailable, or the contact
 * has no usable details.
 */
export async function pickContact(): Promise<PickedContact | null> {
  const m = manager();
  if (!m) return null;
  try {
    const available = (await m.getProperties?.()) ?? ['name', 'email'];
    const wanted = ['name', 'email'].filter((p) => available.includes(p));
    if (wanted.length === 0) return null;

    const results = await m.select(wanted, { multiple: false });
    const c = results?.[0];
    if (!c) return null;

    return {
      name: c.name?.find(Boolean),
      email: c.email?.find(Boolean),
    };
  } catch {
    // User dismissed the picker or the browser blocked it.
    return null;
  }
}
