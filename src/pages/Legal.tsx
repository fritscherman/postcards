import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="legal-page">
      <header className="legal-head">
        <Link to="/" className="legal-home" aria-label={t('legal.home')}>
          <Logo size={32} /> <span className="landing-wordmark legal-wordmark">Wanderpost</span>
        </Link>
        <Link to="/" className="btn link">{t('legal.back')}</Link>
      </header>

      <h1>{title}</h1>
      <div className="legal-body">{children}</div>

      <footer className="legal-foot">
        <Link to="/impressum">{t('legal.imprint')}</Link>
        <span aria-hidden="true">·</span>
        <Link to="/datenschutz">{t('legal.privacy')}</Link>
      </footer>
    </div>
  );
}

export function Impressum() {
  return (
    <LegalLayout title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        Frostbote GbR<br />
        Benjamin Fritsch<br />
        Haubergweg 11<br />
        58640 Iserlohn<br />
        Deutschland
      </p>

      <h2>Vertreten durch</h2>
      <p>Benjamin Fritsch</p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href="mailto:support@wanderpost.world">support@wanderpost.world</a>
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>Benjamin Fritsch, Anschrift wie oben.</p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den
        allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht
        verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen
        zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Unser Angebot enthält ggf. Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss
        haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
        Seiten verantwortlich.
      </p>

      <h2>EU-Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer noopener">
          https://ec.europa.eu/consumers/odr/
        </a>
        . Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </LegalLayout>
  );
}

export function Datenschutz() {
  return (
    <LegalLayout title="Datenschutzerklärung">
      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlich für die Datenverarbeitung auf dieser Plattform ist:<br />
        Frostbote GbR · Benjamin Fritsch<br />
        Haubergweg 11, 58640 Iserlohn, Deutschland<br />
        E-Mail: <a href="mailto:support@wanderpost.world">support@wanderpost.world</a>
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <p>Zur Bereitstellung von Wanderpost verarbeiten wir folgende Daten:</p>
      <ul>
        <li>
          <strong>Kontodaten:</strong> Name, E-Mail-Adresse und ein verschlüsselt gespeichertes Passwort
          (als Hash), damit du dich anmelden kannst.
        </li>
        <li>
          <strong>Inhalte:</strong> die von dir erstellten Postkarten (Bilder, Nachrichten, gewählte
          Vorlage/Briefmarke und ggf. ein hinzugefügter oder aus dem Foto ausgelesener Ort) sowie deine
          Freundesverbindungen.
        </li>
        <li>
          <strong>Push-Abonnements:</strong> falls du Benachrichtigungen aktivierst, speichern wir die von
          deinem Browser/Gerät bereitgestellte Push-Adresse, um dir Hinweise auf neue Postkarten zu senden.
        </li>
        <li>
          <strong>Technische Daten:</strong> beim Abruf der Seite verarbeitet der Server technisch notwendige
          Verbindungsdaten (z.&nbsp;B. IP-Adresse, Zeitpunkt, abgerufene Ressource).
        </li>
      </ul>

      <h2>3. Zwecke und Rechtsgrundlagen</h2>
      <p>
        Wir verarbeiten diese Daten, um dir das Konto, das Erstellen und Empfangen von Postkarten sowie –
        auf deinen Wunsch – Benachrichtigungen bereitzustellen. Rechtsgrundlage ist die Erfüllung des
        Nutzungsvertrags (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO). Push-Benachrichtigungen erfolgen auf
        Grundlage deiner Einwilligung (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a DSGVO), die du jederzeit über die
        Glocke in der App oder die Browser-Einstellungen widerrufen kannst. Technisch notwendige
        Verbindungsdaten verarbeiten wir auf Grundlage unseres berechtigten Interesses am sicheren Betrieb
        (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO).
      </p>

      <h2>4. Speicherung und Hosting</h2>
      <p>
        Deine Daten werden auf einem von uns betriebenen Server gespeichert. Inhalte und Kontodaten bleiben
        gespeichert, bis du sie löschst oder dein Konto auflöst. Lokal in deinem Browser gespeicherte Daten
        (z.&nbsp;B. dein Anmelde-Token) kannst du jederzeit selbst entfernen.
      </p>

      <h2>5. Weitergabe an Dritte</h2>
      <p>
        Wir geben deine Daten nicht zu Werbezwecken weiter. Eine Übermittlung erfolgt nur, soweit es zur
        Bereitstellung des Dienstes erforderlich ist – etwa wenn beim Versand von Push-Nachrichten der
        Push-Dienst deines Browsers (z.&nbsp;B. Google, Mozilla, Apple) technisch beteiligt ist – oder wenn
        wir gesetzlich dazu verpflichtet sind.
      </p>

      <h2>6. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
        Datenübertragbarkeit sowie Widerspruch. Eine erteilte Einwilligung kannst du jederzeit mit Wirkung
        für die Zukunft widerrufen. Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde
        zu beschweren. Wende dich für die Ausübung deiner Rechte an{' '}
        <a href="mailto:support@wanderpost.world">support@wanderpost.world</a>.
      </p>

      <p className="legal-note">Stand: Juni 2026</p>
    </LegalLayout>
  );
}
