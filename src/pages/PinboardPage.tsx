import { useTranslation } from 'react-i18next';
import { isOnline } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { LocalPinboard } from '../components/LocalPinboard';
import { BoardsPinboard } from '../components/BoardsPinboard';

export function PinboardPage() {
  const { t } = useTranslation();
  const { user, guest } = useAuth();
  // Real accounts get shareable, multi-board pinwände from the server.
  // Demo / guest mode keeps the single on-device board.
  const online = isOnline && !!user && !guest;

  return (
    <div className="page pinboard-page">
      <header className="page-head">
        <h1>{t('pinboard.title')}</h1>
        <p>{online ? t('pinboard.subtitleOnline') : t('pinboard.subtitle')}</p>
      </header>

      {online ? <BoardsPinboard /> : <LocalPinboard />}
    </div>
  );
}
