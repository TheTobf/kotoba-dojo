import { Fill, LegalPage } from './LegalPage'

export function Component() {
  return (
    <LegalPage title="Datenschutzerklärung" updated="[BITTE AUSFÜLLEN]">
      <h2>1. Kurz gesagt</h2>
      <ul>
        <li>Zum Lernen brauchst du kein Konto. Ohne Konto liegt dein Lernfortschritt nur auf deinem Gerät.</li>
        <li>Mit einem kostenlosen Konto wird dein Lernstand zusätzlich auf unserem Server gesichert (Speicherort EU), damit er auf allen deinen Geräten gleich ist.</li>
        <li>Wir setzen kein Tracking, keine Werbe-Cookies und keine Analyse-Dienste ein. Deshalb gibt es keinen Cookie-Banner.</li>
        <li>Schriften und alle Dateien der App kommen von unserer eigenen Adresse, nicht von Dritten wie Google.</li>
        <li>Für ein Konto speichern wir deine E-Mail-Adresse, für Pro zusätzlich den Stand deines Abos.</li>
      </ul>

      <h2>2. Verantwortlicher</h2>
      <p><Fill>Name, Anschrift, E-Mail-Adresse (wie im Impressum)</Fill></p>

      <h2>3. Besuch der Webseite</h2>
      <p>
        Beim Aufruf der Seiten verarbeitet unser Hosting-Anbieter Cloudflare technisch notwendige Verbindungsdaten (z. B. IP-Adresse,
        Zeitpunkt, aufgerufene Adresse), um die Seite auszuliefern und vor Angriffen zu schützen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.{' '}
        <Fill>Speicherdauer der Protokolle und Auftragsverarbeitungsvertrag mit Cloudflare prüfen und ergänzen</Fill>
      </p>

      <h2>4. Daten auf deinem Gerät</h2>
      <p>
        Lernfortschritt, Einstellungen (z. B. heller oder dunkler Modus) und heruntergeladene Lerninhalte werden im Speicher deines Browsers
        abgelegt (IndexedDB, localStorage, Cache für die Offline-Nutzung). Diese Daten verlassen dein Gerät nicht. Die Speicherung ist für die
        Funktion der App erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).
      </p>

      <h2>5. Konto und Anmeldung</h2>
      <p>
        Ein Konto ist freiwillig und kostenlos; für Pro ist es nötig. Du legst es mit deiner E-Mail-Adresse an. Zur Anmeldung schicken wir dir einen Einmalcode. Nach der Anmeldung setzen wir
        ein technisch notwendiges Sitzungs-Cookie („kd_session“, Laufzeit 30 Tage), das dich angemeldet hält. Rechtsgrundlage ist
        Art. 6 Abs. 1 lit. b DSGVO; für das Cookie § 25 Abs. 2 Nr. 2 TDDDG.
      </p>

      <h3>Abgleich zwischen Geräten</h3>
      <p>
        Mit Konto speichern wir deinen Lernstand auf unserem Server: welche Karten du wann wiederholt hast, erledigte Missionen,
        Punkte, Lernserie und Erfolge. Einstellungen und das Bewertungs-Protokoll bleiben auf dem Gerät. Der Abgleich ist der
        Zweck des Kontos (Art. 6 Abs. 1 lit. b DSGVO). Du kannst dein Konto mit allen diesen Daten im Profil jederzeit selbst löschen.
      </p>

      <h2>6. Bezahlung</h2>
      <p>
        Die Zahlung wickelt Stripe ab (Stripe Payments Europe, Ltd., Irland). Deine Zahlungsdaten gibst du direkt bei Stripe ein; wir erhalten
        sie nicht. Wir speichern eine Kundennummer von Stripe, den Tarif, den Status und die Laufzeit deines Abos sowie den Zeitpunkt deiner
        Zustimmungen beim Kauf. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und lit. c DSGVO.{' '}
        <Fill>Auftragsverarbeitung bzw. Verantwortlichkeit von Stripe und Drittlandübermittlung prüfen und ergänzen</Fill>
      </p>

      <h2>7. Gespräche mit KI-Figuren (nur Pro)</h2>
      <p>
        Im Sprechmodus sendest du Nachrichten an KI-Figuren. Die Figuren sind keine Menschen. Deine Nachrichten werden zur Erzeugung der Antwort
        an unseren Server und von dort an einen KI-Dienst übermittelt. Aus Korrekturen erstellen wir Karteikarten, die wir deinem Konto zuordnen.{' '}
        <Fill>KI-Anbieter, Sitz, Speicherdauer und Rechtsgrundlage ergänzen, sobald die echte KI angeschlossen ist (derzeit nur Platzhalter-Antworten ohne externen Dienst)</Fill>
      </p>

      <h3>Spracheingabe</h3>
      <p>
        Wenn du Antworten ins Mikrofon sprichst, erkennt dein Browser die Sprache. Dazu sendet er den Ton an seinen Hersteller,
        bei Chrome an Google, bei Safari an Apple (teilweise auf dem Gerät). Kotoba Dojo erhält nur den erkannten Text und
        speichert keine Aufnahmen. Die Spracheingabe startet erst, nachdem du zugestimmt hast; du kannst sie im Profil ausschalten.{' '}
        <Fill>Rechtsgrundlage (Einwilligung, Art. 6 Abs. 1 lit. a DSGVO) und Drittlandübermittlung prüfen</Fill>
      </p>

      <h2>8. Warteliste</h2>
      <p>
        Wenn du dich für die Warteliste einträgst, speichern wir deine E-Mail-Adresse und den Zeitpunkt deiner Bestätigung, um dich einmalig über
        den Start zu informieren. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die du jederzeit widerrufen kannst.
      </p>

      <h2>9. Kündigungsformular</h2>
      <p>
        Für eine Kündigung über „Verträge hier kündigen“ verarbeiten wir die angegebene E-Mail-Adresse, die Art der Kündigung, einen
        gegebenenfalls genannten Grund und den Zeitpunkt des Eingangs, um die Kündigung umzusetzen und nachzuweisen.
      </p>

      <h2>10. E-Mail-Versand</h2>
      <p><Fill>Dienstleister für den E-Mail-Versand (Anmeldecodes, Bestätigungen) nennen, sobald einer angebunden ist</Fill></p>

      <h2>11. Speicherort und Speicherdauer</h2>
      <p>
        Unsere Datenbank liegt bei Cloudflare mit Speicherort in der Europäischen Union. Kontodaten löschen wir, wenn du dein Konto löschen lässt,
        soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen. <Fill>Konkrete Fristen ergänzen (z. B. steuerliche Aufbewahrung)</Fill>
      </p>

      <h2>12. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das
        Recht, eine Einwilligung zu widerrufen. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren.{' '}
        <Fill>Zuständige Aufsichtsbehörde und Kontakt für Anfragen ergänzen</Fill>
      </p>
    </LegalPage>
  )
}
