import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff } from 'lucide-react';
import { disablePush, enablePush, pushState, type PushState } from '../push';

/**
 * Bell button in the app bar. Only renders once we know the server supports push
 * and the browser can do it — so a non-functional control never shows up.
 */
export function NotificationToggle() {
  const { t } = useTranslation();
  const [state, setState] = useState<PushState | 'loading'>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    pushState()
      .then((s) => !cancelled && setState(s))
      .catch(() => !cancelled && setState('unavailable'));
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide entirely when there's nothing useful to offer.
  if (state === 'loading' || state === 'unsupported' || state === 'unavailable') return null;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      setState(state === 'on' ? await disablePush() : await enablePush());
    } catch {
      /* leave the state as-is */
    } finally {
      setBusy(false);
    }
  }

  const on = state === 'on';
  const title =
    state === 'denied'
      ? t('notif.blocked')
      : on
        ? t('notif.on')
        : t('notif.enable');

  return (
    <button
      className="btn link notif-toggle"
      onClick={toggle}
      disabled={busy || state === 'denied'}
      title={title}
      aria-label={title}
      aria-pressed={on}
    >
      {on ? <Bell size={18} /> : <BellOff size={18} />}
    </button>
  );
}
