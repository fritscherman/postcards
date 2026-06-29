import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Camera,
  MapPin,
  RectangleHorizontal,
  RectangleVertical,
  RefreshCw,
  Send,
  Wand2,
} from 'lucide-react';
import { usePostcards } from '../store/PostcardStore';
import { FILTERS, STAMPS, TEMPLATES } from '../data/templates';
import { FRIENDS } from '../data/seed';
import { fileToDataUrl } from '../utils/image';
import { readExifLocation } from '../utils/exif';
import { playWhoosh } from '../utils/sound';
import { initials } from '../utils/initials';
import { PostcardCard } from '../components/PostcardCard';
import { PhotoDecorator } from '../components/PhotoDecorator';
import { StampMaker } from '../components/StampMaker';
import { CUSTOM_STAMP_ID } from '../data/templates';
import { isOnline, ApiError, apiListFriends, type AuthUser } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { GuestBanner } from '../components/GuestBanner';
import { useFeedback } from '../components/Feedback';
import type { Crop, GeoLocation, Orientation, Stamp } from '../types';

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>
      <rect width='600' height='400' fill='#e2e8f0'/>
      <text x='300' y='215' font-size='96' text-anchor='middle' font-family='sans-serif'>📷</text>
    </svg>`,
  );

export function CreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { sendPostcard, userName } = usePostcards();
  const { guest } = useAuth();
  const { notify } = useFeedback();
  // Guests (and the demo build) send locally; only real accounts reach the server.
  const localMode = !isOnline || guest;
  const fileRef = useRef<HTMLInputElement>(null);
  const [friends, setFriends] = useState<AuthUser[]>([]);

  // Real accounts pick recipients from their connected friends.
  useEffect(() => {
    if (localMode) return;
    apiListFriends()
      .then((r) => setFriends(r.friends))
      .catch(() => setFriends([]));
  }, [localMode]);

  const [image, setImage] = useState<string>(PLACEHOLDER);
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [crop, setCrop] = useState<Crop>({ zoom: 1, x: 50, y: 50 });
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [stampId, setStampId] = useState(STAMPS[0].id);
  const [customStamp, setCustomStamp] = useState<Stamp | undefined>();
  const [makingStamp, setMakingStamp] = useState(false);
  const [filterId, setFilterId] = useState(FILTERS[0].id);
  const [message, setMessage] = useState('');
  // Recipients are identified by email (online) or friend name (demo); supports many at once.
  const [selected, setSelected] = useState<string[]>([]);
  const [location, setLocation] = useState<GeoLocation | undefined>();
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [decorating, setDecorating] = useState(false);
  const [flying, setFlying] = useState(false);

  // Available recipients as { key (send id), name } pairs.
  const options = localMode
    ? FRIENDS.map((name) => ({ key: name, name }))
    : friends.map((f) => ({ key: f.email, name: f.name }));

  // Prefill the recipient when replying via /create?to=…
  const prefill = params.get('to');
  useEffect(() => {
    if (prefill) setSelected((prev) => (prev.includes(prefill) ? prev : [...prev, prefill]));
  }, [prefill]);

  const hasPhoto = image !== PLACEHOLDER;
  const filterCss = FILTERS.find((f) => f.id === filterId)?.css ?? 'none';
  const nameFor = (key: string) => options.find((o) => o.key === key)?.name ?? key;
  const recipientLabel =
    selected.length === 0
      ? t('create.recipientDefault')
      : selected.length === 1
        ? nameFor(selected[0])
        : t('create.recipientsMany', { count: selected.length });

  function toggleRecipient(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImage(await fileToDataUrl(file));
      setCrop({ zoom: 1, x: 50, y: 50 });
      // Pull the capture location straight from the photo's EXIF data, if present.
      const exif = await readExifLocation(file);
      if (exif) setLocation(exif);
    } catch (err) {
      notify(t('create.errPhotoLoad', { error: (err as Error).message }), { type: 'error' });
    }
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      notify(t('create.errGeoUnsupported'), { type: 'error' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`,
          source: 'manual',
        });
        setLocating(false);
      },
      () => {
        notify(t('create.errGeoFailed'), { type: 'error' });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function handleSend() {
    if (!hasPhoto) {
      notify(t('create.errNeedPhoto'), { type: 'error' });
      return;
    }
    if (selected.length === 0) {
      notify(t('create.errNeedRecipient'), { type: 'error' });
      return;
    }
    setBusy(true);
    setFlying(true);
    playWhoosh();
    try {
      // Send one postcard per selected recipient.
      for (const key of selected) {
        await sendPostcard({
          image,
          orientation,
          crop,
          templateId,
          stampId,
          customStamp: stampId === CUSTOM_STAMP_ID ? customStamp : undefined,
          filter: filterCss,
          message,
          to: nameFor(key),
          toEmail: localMode ? undefined : key,
          from: userName,
          location,
        });
      }
      setTimeout(() => navigate('/mailbox?sent=1'), 1100);
    } catch (err) {
      setFlying(false);
      setBusy(false);
      if (err instanceof ApiError && err.code === 'NO_RECIPIENT') {
        notify(t('create.errNoRecipient'), { type: 'error' });
      } else {
        notify(t('create.errSendFailed', { error: (err as Error).message }), { type: 'error' });
      }
    }
  }

  const previewCard = {
    id: 'preview',
    image,
    orientation,
    crop,
    templateId,
    stampId,
    customStamp: stampId === CUSTOM_STAMP_ID ? customStamp : undefined,
    filter: filterCss,
    message,
    to: recipientLabel,
    from: userName,
    location,
    createdAt: Date.now(),
    box: 'outbox' as const,
    read: true,
    pin: { x: 0, y: 0, rotation: 0 },
  };

  return (
    <div className="page create-page">
      <header className="page-head">
        <h1>{t('create.title')}</h1>
        <p>{t('create.subtitle')}</p>
      </header>

      <div className="create-grid">
        <section className="editor">
          <div className="field">
            <label>{t('create.step1')}</label>
            <div className="photo-actions">
              <button className="btn ghost" onClick={() => fileRef.current?.click()}>
                {hasPhoto ? <RefreshCw size={16} /> : <Camera size={16} />}
                {hasPhoto ? t('create.otherPhoto') : t('create.choosePhoto')}
              </button>
              {hasPhoto && (
                <button className="btn ghost" onClick={() => setDecorating(true)}>
                  <Wand2 size={16} /> {t('create.decorate')}
                </button>
              )}
              {/* No `capture` attribute: lets the phone offer both gallery and camera.
                  Visually hidden (not display:none) so a programmatic .click() still
                  opens the picker inside an installed/standalone PWA on iOS. */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="visually-hidden-input"
                onChange={onPickFile}
              />
            </div>
            <button className="btn link" onClick={captureLocation} disabled={locating}>
              <MapPin size={15} />
              {locating
                ? ` ${t('create.searchingLocation')}`
                : location
                  ? ` ${location.label}${location.source === 'exif' ? t('create.fromPhotoSuffix') : ''}`
                  : ` ${t('create.addLocation')}`}
            </button>

            <div className="orient-row">
              <span className="mini-label">{t('create.orientation')}</span>
              <div className="seg">
                <button
                  className={`seg-btn ${orientation === 'landscape' ? 'on' : ''}`}
                  onClick={() => setOrientation('landscape')}
                >
                  <RectangleHorizontal size={16} /> {t('create.landscape')}
                </button>
                <button
                  className={`seg-btn ${orientation === 'portrait' ? 'on' : ''}`}
                  onClick={() => setOrientation('portrait')}
                >
                  <RectangleVertical size={16} /> {t('create.portrait')}
                </button>
              </div>
            </div>

            {hasPhoto && (
              <p className="field-hint">{t('create.cropHint')}</p>
            )}
          </div>

          <div className="field">
            <label>{t('create.step2')}</label>
            <div className="chip-row">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  className={`chip ${templateId === tpl.id ? 'sel' : ''}`}
                  style={{ background: tpl.frame, color: tpl.accent, borderColor: tpl.accent }}
                  onClick={() => setTemplateId(tpl.id)}
                >
                  {t(`templates.${tpl.id}`, tpl.name)}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>{t('create.step3')}</label>
            <div className="chip-row">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  className={`filter-chip ${filterId === f.id ? 'sel' : ''}`}
                  onClick={() => setFilterId(f.id)}
                >
                  {/* Preview each filter on a mini thumbnail of the actual photo,
                      so you see how it really looks. Falls back to a colourful
                      swatch until a photo is chosen. */}
                  <span
                    className={`filter-swatch ${hasPhoto ? 'photo' : ''}`}
                    style={hasPhoto ? { backgroundImage: `url(${image})`, filter: f.css } : { filter: f.css }}
                  />
                  {t(`filters.${f.id}`, f.name)}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>{t('create.step4')}</label>
            <textarea
              value={message}
              maxLength={280}
              placeholder={t('create.messagePlaceholder')}
              onChange={(e) => setMessage(e.target.value)}
            />
            <span className="counter">{message.length}/280</span>
          </div>

          <div className="field">
            <label>{t('create.step5')}</label>
            <div className="chip-row">
              {STAMPS.map((s) => (
                <button
                  key={s.id}
                  className={`stamp-chip ${stampId === s.id ? 'sel' : ''}`}
                  style={{ background: s.bg }}
                  onClick={() => setStampId(s.id)}
                  title={s.name}
                >
                  {s.emoji}
                </button>
              ))}
              {customStamp && (
                <button
                  className={`stamp-chip ${stampId === CUSTOM_STAMP_ID ? 'sel' : ''}`}
                  style={{ background: customStamp.bg }}
                  onClick={() => setStampId(CUSTOM_STAMP_ID)}
                  onDoubleClick={() => setMakingStamp(true)}
                  title={t('create.customStampTitle')}
                >
                  {customStamp.emoji}
                </button>
              )}
              <button
                className="stamp-chip add-stamp"
                onClick={() => setMakingStamp(true)}
                title={t('create.makeStampTitle')}
              >
                +
              </button>
            </div>
          </div>

          <div className="field">
            <label>{t('create.step6')} {selected.length > 0 && <span className="counter">{t('create.selectedCount', { count: selected.length })}</span>}</label>
            {options.length > 0 ? (
              <div className="recipient-row">
                {options.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    className={`recipient-chip ${selected.includes(o.key) ? 'sel' : ''}`}
                    onClick={() => toggleRecipient(o.key)}
                    aria-pressed={selected.includes(o.key)}
                    title={o.name}
                  >
                    <span className="recipient-avatar">{initials(o.name)}</span>
                    <span className="recipient-name">{o.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="field-hint">{t('create.noFriends')}</p>
            )}
          </div>

          <GuestBanner message={t('create.guestBanner')} />

          <button
            className="btn primary big"
            onClick={handleSend}
            disabled={busy || selected.length === 0}
          >
            <Send size={17} />
            {busy
              ? ` ${t('create.sending')}`
              : selected.length > 1
                ? ` ${t('create.sendToMany', { count: selected.length })}`
                : ` ${t('create.sendToOne', { name: recipientLabel })}`}
          </button>
        </section>

        <section className="preview">
          <span className="preview-hint">{hasPhoto ? t('create.previewFlipHint') : t('create.previewHint')}</span>
          <div className="preview-card-wrap">
            <PostcardCard
              card={previewCard}
              editable={hasPhoto}
              onCropChange={(c) => setCrop(c)}
              onCardClick={hasPhoto ? undefined : () => fileRef.current?.click()}
            />
            {!hasPhoto && <span className="dropzone-cta">{t('create.tapToChoosePhoto')}</span>}
          </div>
        </section>
      </div>

      {decorating && (
        <PhotoDecorator
          src={image}
          onApply={(url) => {
            setImage(url);
            setDecorating(false);
          }}
          onClose={() => setDecorating(false)}
        />
      )}

      {makingStamp && (
        <StampMaker
          initial={customStamp}
          onApply={(s) => {
            setCustomStamp(s);
            setStampId(CUSTOM_STAMP_ID);
            setMakingStamp(false);
          }}
          onClose={() => setMakingStamp(false)}
        />
      )}

      {flying && (
        <div className="fly-overlay">
          <div className="fly-card">
            <PostcardCard card={previewCard} flippable={false} />
          </div>
          <p className="fly-text">{t('create.flyingTo', { name: recipientLabel })}</p>
        </div>
      )}
    </div>
  );
}
