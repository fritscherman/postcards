# ✉️ Wanderpost

Eine verspielte, hochwertige Web-App zum Erstellen und Versenden **virtueller Postkarten** –
Grüße, die um die Welt wandern. Wähle ein Foto, gestalte deine Karte mit Vorlagen, Text und
Briefmarke und schick sie ab – deine Karten landen im Briefkasten, auf einer Weltkarte und an der Pinwand.

> Prototyp: alle Daten werden lokal im Browser (`localStorage`) gespeichert – kein Login, kein Server nötig.

## Funktionen

- **✏️ Erstellen** – Foto wählen oder aufnehmen, Vorlage & Briefmarke aussuchen (oder eine
  **eigene Briefmarke** aus Emoji + Farbe gestalten), Text schreiben, Aufnahmeort (GPS) hinzufügen,
  Live-Vorschau der Postkarte (zum Umdrehen klicken) und an Freunde senden.
- **💌 Einladen** – Freund:innen per Link, WhatsApp oder **QR-Code** zum Scannen einladen.
- **📬 Briefkasten** – Empfangene und versendete Karten, mit „Neu"-Markierung für Ungelesenes.
- **🌍 Weltansicht** – Interaktive Karte (Leaflet), jede Karte steckt am Aufnahmeort ihres Fotos.
- **📌 Pinwand** – Korkbrett, auf dem sich die Karten frei verschieben lassen (Drag & Drop).

## Tech-Stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [React Router](https://reactrouter.com/) für die Navigation
- [React-Leaflet](https://react-leaflet.js.org/) für die Weltkarte
- Schriften: Fraunces (Headlines), Quicksand (UI), Caveat (Handschrift)

## Loslegen

```bash
npm install
npm run dev      # Entwicklungs-Server auf http://localhost:5173
npm run build    # Produktions-Build nach dist/
npm run preview  # Build lokal ansehen
npm test         # Tests (Vitest) im Watch-Modus
npm run test:run # Tests einmalig (wie in der CI)
```

Tests laufen mit [Vitest](https://vitest.dev/) + Testing Library; bei jedem Push / PR
prüft ein GitHub-Actions-Workflow (`.github/workflows/ci.yml`) Build und Tests.

## Projektstruktur

```
src/
├── components/    PostcardCard (3D-Flip), NavBar
├── data/          Vorlagen, Briefmarken, Beispiel-Postkarten
├── pages/         Create · Mailbox · World · Pinboard
├── store/         PostcardStore (Context + localStorage)
├── utils/         Bild-Verkleinerung
└── types.ts       Datenmodell
```

## Mögliche nächste Schritte

- Mehr Vorlagen & Foto-Sticker-Bibliothek
- Eigene Briefmarken als hochgeladenes Bild (statt nur Emoji)
- Karten-Reaktionen über das Herz hinaus
