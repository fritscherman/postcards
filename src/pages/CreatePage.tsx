import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePostcards } from '../store/PostcardStore';
import { FILTERS, STAMPS, TEMPLATES } from '../data/templates';
import { FRIENDS } from '../data/seed';
import { fileToDataUrl } from '../utils/image';
import { playWhoosh } from '../utils/sound';
import { PostcardCard } from '../components/PostcardCard';
import { PhotoDecorator } from '../components/PhotoDecorator';
import type { GeoLocation } from '../types';

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
  const fileRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<string>(PLACEHOLDER);
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [stampId, setStampId] = useState(STAMPS[0].id);
  const [filterId, setFilterId] = useState(FILTERS[0].id);
  const [message, setMessage] = useState('');
  const [to, setTo] = useState(FRIENDS[0]);
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

  function handleSend() {
    if (!hasPhoto) {
      alert('Bitte wähle zuerst ein Foto aus. 📷');
      return;
    }
    setBusy(true);
    setFlying(true);
    playWhoosh();
    sendPostcard({ image, templateId, stampId, filter: filterCss, message, to, from: userName, location });
    setTimeout(() => navigate('/mailbox?sent=1'), 1100);
  }

  const previewCard = {
    id: 'preview',
    image,
    templateId,
    stampId,
    filter: filterCss,
    message,
    to,
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
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={onPickFile}
              />
            </div>
            <button className="btn link" onClick={captureLocation} disabled={locating}>
              {locating ? '📍 Suche Standort…' : location ? `📍 ${location.label}` : '📍 Aufnahmeort hinzufügen'}
            </button>
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
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {FRIENDS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <button className="btn primary big" onClick={handleSend} disabled={busy}>
            {busy ? 'Wird versendet… ✈️' : `An ${to} senden ✉️`}
          </button>
        </section>

        <section className="preview">
          <span className="preview-hint">Vorschau · klick zum Umdrehen</span>
          <PostcardCard card={previewCard} />
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
