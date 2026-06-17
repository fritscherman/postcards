import { useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { Search } from 'lucide-react';
import L from 'leaflet';
import { usePostcards } from '../store/PostcardStore';
import { stampById } from '../data/templates';
import { PostcardDetail } from '../components/PostcardDetail';
import type { Postcard } from '../types';

/** Build a playful pin marker that shows the postcard's stamp emoji. */
function makeIcon(emoji: string) {
  return L.divIcon({
    className: 'map-pin',
    html: `<div class="map-pin-bubble"><span>${emoji}</span></div>`,
    iconSize: [44, 52],
    iconAnchor: [22, 50],
    popupAnchor: [0, -48],
  });
}

export function WorldPage() {
  const { postcards } = usePostcards();
  const [active, setActive] = useState<Postcard | null>(null);
  const [detail, setDetail] = useState<Postcard | null>(null);

  const located = useMemo(() => postcards.filter((c) => c.location), [postcards]);

  return (
    <div className="page world-page">
      <header className="page-head">
        <h1>Weltansicht</h1>
        <p>Jede Postkarte steckt dort, wo ihr Foto entstanden ist. 🌍</p>
      </header>

      <div className="map-shell">
        <MapContainer center={[25, 15]} zoom={2} scrollWheelZoom className="leaflet-map" worldCopyJump>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {located.map((card) => (
            <Marker
              key={card.id}
              position={[card.location!.lat, card.location!.lng]}
              icon={makeIcon(stampById(card.stampId).emoji)}
              eventHandlers={{ click: () => setActive(card) }}
            >
              <Popup>
                <div className="map-popup">
                  <img src={card.image} alt="" />
                  <strong>{card.location!.label}</strong>
                  <span>von {card.from}</span>
                  <button className="btn link" onClick={() => setDetail(card)}><Search size={15} /> Details</button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {located.length === 0 && (
          <div className="map-empty">Noch keine verorteten Postkarten — füge beim Erstellen einen Aufnahmeort hinzu.</div>
        )}
      </div>

      {active && (
        <p className="world-hint">
          Zuletzt angetippt: <strong>{active.location?.label}</strong> · {active.message || '…'}
        </p>
      )}

      {detail && <PostcardDetail card={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
