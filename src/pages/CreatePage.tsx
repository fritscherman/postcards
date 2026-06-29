import { useEffect, useRef, useState } from 'react';
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
import { CustomStampChip } from '../components/CustomStampChip';
import { CUSTOM_STAMP_ID } from '../data/templates';
import { isOnline, ApiError, apiListFriends, type AuthUser } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { GuestBanner } from '../components/GuestBanner';
import { useFeedback } from '../components/Feedback';
import { useCustomStamps } from '../hooks/useCustomStamps';
import type { Crop, GeoLocation, Orientation } from '../types';

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>
      <rect width='600' height='400' fill='#e2e8f0'/>
      <text x='300' y='200' font-size='40' fill='#94a3b8' text-anchor='middle' font-family='sans-serif'>Foto wählen 📷</text>
    </svg>`,
  );

export function CreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { sendPostcard, userName } = usePostcards();
  const { guest } = useAuth();
  const { notify, confirm } = useFeedback();
  const { stamps: customStamps, addStamp, removeStamp } = useCustomStamps();
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
  // Holds either a built-in stamp id or a saved custom stamp's own id.
  const [stampId, setStampId] = useState(STAMPS[0].id);
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
  // A custom stamp is selected when stampId matches one of the saved stamps.
  // The card always travels with stampId=CUSTOM_STAMP_ID + the stamp itself so
  // the recipient can render it (its private id means nothing on their device).
  const selectedCustom = customStamps.find((s) => s.id === stampId);
  const sendStampId = selectedCustom ? CUSTOM_STAMP_ID : stampId;
  const sendCustomStamp = selectedCustom
    ? { ...selectedCustom, id: CUSTOM_STAMP_ID }
    : undefined;
  const nameFor = (key: string) => options.find((o) => o.key === key)?.name ?? key;
  const recipientLabel =
    selected.length === 0
      ? 'Freund:in'
      : selected.length === 1
        ? nameFor(selected[0])
        : `${selected.length} Freund:innen`;

  function toggleRecipient(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function handleRemoveStamp(id: string) {
    const ok = await confirm({
      title: 'Briefmarke entfernen?',
      message: 'Diese eigene Briefmarke wird von diesem Gerät gelöscht.',
      confirmLabel: 'Entfernen',
      danger: true,
    });
    if (!ok) return;
    removeStamp(id);
    // If the removed stamp was selected, fall back to the first built-in one.
    setStampId((prev) => (prev === id ? STAMPS[0].id : prev));
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
      notify('Fehler beim Laden des Fotos: ' + (err as Error).message, { type: 'error' });
    }
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      notify('Standort wird von diesem Browser nicht unterstützt.', { type: 'error' });
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
        notify('Standort konnte nicht ermittelt werden.', { type: 'error' });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function handleSend() {
    if (!hasPhoto) {
      notify('Bitte wähle zuerst ein Foto aus. 📷', { type: 'error' });
      return;
    }
    if (selected.length === 0) {
      notify('Bitte wähle mindestens eine Empfänger:in aus.', { type: 'error' });
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
          stampId: sendStampId,
          customStamp: sendCustomStamp,
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
        notify('Diese Person ist noch nicht dabei. Lade sie oben über „💌 Einladen" ein.', {
          type: 'error',
        });
      } else {
        notify('Senden fehlgeschlagen: ' + (err as Error).message, { type: 'error' });
      }
    }
  }

  const previewCard = {
    id: 'preview',
    image,
    orientation,
    crop,
    templateId,
    stampId: sendStampId,
    customStamp: sendCustomStamp,
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
        <h1>Neue Postkarte</h1>
        <p>Wähle ein Foto, gestalte deine Karte und sende sie ab. ✉️</p>
      </header>

      <div className="create-grid">
        <section className="editor">
          <div className="field">
            <label>1 · Foto</label>
            <div className="photo-actions">
              <button className="btn ghost" onClick={() => fileRef.current?.click()}>
                {hasPhoto ? <RefreshCw size={16} /> : <Camera size={16} />}
                {hasPhoto ? 'Anderes Foto' : 'Foto wählen / aufnehmen'}
              </button>
              {hasPhoto && (
                <button className="btn ghost" onClick={() => setDecorating(true)}>
                  <Wand2 size={16} /> Verzieren
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
                ? ' Suche Standort…'
                : location
                  ? ` ${location.label}${location.source === 'exif' ? ' (aus Foto)' : ''}`
                  : ' Aufnahmeort hinzufügen'}
            </button>

            <div className="orient-row">
              <span className="mini-label">Ausrichtung</span>
              <div className="seg">
                <button
                  className={`seg-btn ${orientation === 'landscape' ? 'on' : ''}`}
                  onClick={() => setOrientation('landscape')}
                >
                  <RectangleHorizontal size={16} /> Quer
                </button>
                <button
                  className={`seg-btn ${orientation === 'portrait' ? 'on' : ''}`}
                  onClick={() => setOrientation('portrait')}
                >
                  <RectangleVertical size={16} /> Hoch
                </button>
              </div>
            </div>

            {hasPhoto && (
              <p className="field-hint">
                🔍 Zum Zuschneiden direkt in der Vorschau zoomen – mit zwei Fingern, dem Mausrad
                oder per Doppeltipp. Danach ziehen, um den Ausschnitt zu verschieben.
              </p>
            )}
          </div>

          <div className="field">
            <label>2 · Vorlage</label>
            <div className="chip-row">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  className={`chip ${templateId === t.id ? 'sel' : ''}`}
                  style={{ background: t.frame, color: t.accent, borderColor: t.accent }}
                  onClick={() => setTemplateId(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>3 · Filter</label>
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
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>4 · Text</label>
            <textarea
              value={message}
              maxLength={280}
              placeholder="Liebe Grüße aus dem Urlaub…"
              onChange={(e) => setMessage(e.target.value)}
            />
            <span className="counter">{message.length}/280</span>
          </div>

          <div className="field">
            <label>5 · Briefmarke 🏷️</label>
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
              {customStamps.map((s) => (
                <CustomStampChip
                  key={s.id}
                  stamp={s}
                  selected={stampId === s.id}
                  onSelect={() => setStampId(s.id)}
                  onRemove={() => handleRemoveStamp(s.id)}
                />
              ))}
              <button
                className="stamp-chip add-stamp"
                onClick={() => setMakingStamp(true)}
                title="Eigene Briefmarke gestalten"
              >
                +
              </button>
            </div>
          </div>

          <div className="field">
            <label>6 · Empfänger {selected.length > 0 && <span className="counter">{selected.length} gewählt</span>}</label>
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
              <p className="field-hint">
                Du hast noch keine Freund:innen verbunden. Lade jemanden oben über „💌 Einladen" ein —
                sobald er beitritt, erscheint er hier.
              </p>
            )}
          </div>

          <GuestBanner message="Im Gast-Modus bleibt deine Karte nur auf diesem Gerät. Für echtes Versenden an Freund:innen erstelle ein kostenloses Konto." />

          <button
            className="btn primary big"
            onClick={handleSend}
            disabled={busy || selected.length === 0}
          >
            <Send size={17} />
            {busy
              ? ' Wird versendet…'
              : selected.length > 1
                ? ` An ${selected.length} Freund:innen senden`
                : ` An ${recipientLabel} senden`}
          </button>
        </section>

        <section className="preview">
          <span className="preview-hint">{hasPhoto ? 'Vorschau · ⟳ zum Umdrehen' : 'So wird deine Karte aussehen'}</span>
          <div className="preview-card-wrap">
            <PostcardCard
              card={previewCard}
              editable={hasPhoto}
              onCropChange={(c) => setCrop(c)}
              onCardClick={hasPhoto ? undefined : () => fileRef.current?.click()}
            />
            {!hasPhoto && <span className="dropzone-cta">📷 Tippen, um ein Foto zu wählen</span>}
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
          onApply={(s) => {
            const saved = addStamp(s);
            setStampId(saved.id);
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
          <p className="fly-text">Unterwegs zu {recipientLabel}… ✈️</p>
        </div>
      )}
    </div>
  );
}
