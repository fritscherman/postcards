import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePostcards } from '../store/PostcardStore';
import { FILTERS, STAMPS, TEMPLATES } from '../data/templates';
import { FRIENDS } from '../data/seed';
import { fileToDataUrl } from '../utils/image';
import { readExifLocation } from '../utils/exif';
import { playWhoosh } from '../utils/sound';
import { PostcardCard } from '../components/PostcardCard';
import { PhotoDecorator } from '../components/PhotoDecorator';
import { isOnline, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { GuestBanner } from '../components/GuestBanner';
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
  const { sendPostcard, userName } = usePostcards();
  const { guest } = useAuth();
  // Guests (and the demo build) send locally; only real accounts reach the server.
  const localMode = !isOnline || guest;
  const fileRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<string>(PLACEHOLDER);
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [crop, setCrop] = useState<Crop>({ zoom: 1, x: 50, y: 50 });
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [stampId, setStampId] = useState(STAMPS[0].id);
  const [filterId, setFilterId] = useState(FILTERS[0].id);
  const [message, setMessage] = useState('');
  const [to, setTo] = useState(FRIENDS[0]);
  const [toEmail, setToEmail] = useState('');
  const [location, setLocation] = useState<GeoLocation | undefined>();
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [decorating, setDecorating] = useState(false);
  const [flying, setFlying] = useState(false);

  const hasPhoto = image !== PLACEHOLDER;
  const filterCss = FILTERS.find((f) => f.id === filterId)?.css ?? 'none';

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
      alert('Fehler beim Laden des Fotos: ' + (err as Error).message);
    }
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      alert('Standort wird von diesem Browser nicht unterstützt.');
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
        alert('Standort konnte nicht ermittelt werden.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function handleSend() {
    if (!hasPhoto) {
      alert('Bitte wähle zuerst ein Foto aus. 📷');
      return;
    }
    if (!localMode && !toEmail.trim()) {
      alert('Bitte gib die E-Mail-Adresse des Empfängers an.');
      return;
    }
    setBusy(true);
    setFlying(true);
    playWhoosh();
    try {
      await sendPostcard({
        image,
        orientation,
        crop,
        templateId,
        stampId,
        filter: filterCss,
        message,
        to: localMode ? to : toEmail.trim(),
        toEmail: localMode ? undefined : toEmail.trim(),
        from: userName,
        location,
      });
      setTimeout(() => navigate('/mailbox?sent=1'), 1100);
    } catch (err) {
      setFlying(false);
      setBusy(false);
      if (err instanceof ApiError && err.code === 'NO_RECIPIENT') {
        alert('Diese Person ist noch nicht dabei. Lade sie oben über „💌 Einladen" ein.');
      } else {
        alert('Senden fehlgeschlagen: ' + (err as Error).message);
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
    filter: filterCss,
    message,
    to: localMode ? to : toEmail || 'Empfänger:in',
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
                {hasPhoto ? '🔄 Anderes Foto' : '📷 Foto wählen / aufnehmen'}
              </button>
              {hasPhoto && (
                <button className="btn ghost" onClick={() => setDecorating(true)}>
                  🎨 Verzieren
                </button>
              )}
              {/* No `capture` attribute: lets the phone offer both gallery and camera. */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onPickFile}
              />
            </div>
            <button className="btn link" onClick={captureLocation} disabled={locating}>
              {locating
                ? '📍 Suche Standort…'
                : location
                  ? `📍 ${location.label}${location.source === 'exif' ? ' (aus Foto)' : ''}`
                  : '📍 Aufnahmeort hinzufügen'}
            </button>

            <div className="orient-row">
              <span className="mini-label">Ausrichtung</span>
              <div className="seg">
                <button
                  className={`seg-btn ${orientation === 'landscape' ? 'on' : ''}`}
                  onClick={() => setOrientation('landscape')}
                >
                  ▭ Quer
                </button>
                <button
                  className={`seg-btn ${orientation === 'portrait' ? 'on' : ''}`}
                  onClick={() => setOrientation('portrait')}
                >
                  ▯ Hoch
                </button>
              </div>
            </div>

            {hasPhoto && (
              <label className="zoom-row">
                <span className="mini-label">Zoom · zum Zuschneiden ziehen 🔍</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={crop.zoom}
                  onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))}
                />
              </label>
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
                  <span className="filter-swatch" style={{ filter: f.css }} />
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
            </div>
          </div>

          <div className="field">
            <label>6 · Empfänger</label>
            {localMode ? (
              <select value={to} onChange={(e) => setTo(e.target.value)}>
                {FRIENDS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="email"
                placeholder="freund@example.com"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
              />
            )}
          </div>

          <GuestBanner message="Im Gast-Modus bleibt deine Karte nur auf diesem Gerät. Für echtes Versenden an Freund:innen erstelle ein kostenloses Konto." />

          <button className="btn primary big" onClick={handleSend} disabled={busy}>
            {busy ? 'Wird versendet… ✈️' : `An ${localMode ? to : toEmail || 'Freund:in'} senden ✉️`}
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

      {flying && (
        <div className="fly-overlay">
          <div className="fly-card">
            <PostcardCard card={previewCard} flippable={false} />
          </div>
          <p className="fly-text">Unterwegs zu {to}… ✈️</p>
        </div>
      )}
    </div>
  );
}
