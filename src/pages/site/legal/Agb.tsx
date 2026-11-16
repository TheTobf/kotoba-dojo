import { Link } from 'react-router-dom'
import { formatPrice, PLANS, TAX_NOTE } from '../../../../shared/plans'
import { Fill, LegalPage } from './LegalPage'

export function Component() {
  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen" updated="[BITTE AUSFÜLLEN]">
      <h2>1. Geltungsbereich und Anbieter</h2>
      <p>
        Diese Bedingungen gelten für die Nutzung von Kotoba Dojo und den Abschluss des Abonnements „Kotoba Dojo Pro“. Anbieter ist{' '}
        <Fill>Name und Anschrift (wie im Impressum)</Fill>.
      </p>

      <h2>2. Leistungen</h2>
      <p>
        Die Gratis-Funktionen (Lernen von Sätzen und Vokabeln, Lektionen zu Story-Folgen, Probe-Missionen) können ohne Konto und kostenlos
        genutzt werden. Kotoba Dojo Pro schaltet zusätzlich Story-Missionen, Gespräche mit KI-Figuren sowie Korrekturen mit automatisch
        angelegten Karteikarten frei.
      </p>
      <p>
        Die Gesprächspartner im Sprechmodus sind KI-Figuren, keine Menschen. Ihre Antworten können Fehler enthalten. Für KI-Gespräche gilt ein
        tägliches Nachrichtenkontingent pro Konto. <Fill>Kontingent beziffern und Regelung zur Verfügbarkeit ergänzen</Fill>
      </p>

      <h2>3. Vertragsschluss</h2>
      <p>
        Der Vertrag über Kotoba Dojo Pro kommt zustande, wenn du nach Auswahl des Tarifs den Bestellvorgang beim Zahlungsdienstleister Stripe
        abschließt. Vor dem Abschluss siehst du Tarif, Preis und Laufzeit und kannst deine Eingaben korrigieren.{' '}
        <Fill>Ablauf und Vertragstextspeicherung prüfen</Fill>
      </p>

      <h2>4. Preise und Zahlung</h2>
      <p>
        Kotoba Dojo Pro kostet {formatPrice(PLANS.monthly.priceCents)} pro Monat oder {formatPrice(PLANS.yearly.priceCents)} pro Jahr. {TAX_NOTE}{' '}
        Der Betrag wird jeweils zu Beginn des Abrechnungszeitraums über die bei Stripe hinterlegte Zahlungsart eingezogen.
      </p>

      <h2>5. Laufzeit, Verlängerung und Kündigung</h2>
      <p>
        Das Abonnement läuft je nach Tarif einen Monat oder ein Jahr und verlängert sich automatisch. <Fill>Verlängerung des Jahrestarifs
        prüfen: nach § 309 Nr. 9 BGB nach der ersten Laufzeit nur auf unbestimmte Zeit mit Kündigungsfrist von höchstens einem Monat</Fill>
      </p>
      <p>
        Du kannst jederzeit zum Ende des laufenden Abrechnungszeitraums kündigen – über <Link to="/kuendigen">„Verträge hier kündigen“</Link>,
        im Kundenportal oder per E-Mail. Nach der Kündigung bleibt Pro bis zum Ende des bezahlten Zeitraums nutzbar. Das Recht zur
        außerordentlichen Kündigung bleibt unberührt.
      </p>

      <h2>6. Widerrufsrecht</h2>
      <p>Verbrauchern steht ein Widerrufsrecht zu. Einzelheiten stehen in der <Link to="/widerruf">Widerrufsbelehrung</Link>.</p>

      <h2>7. Nutzungsrechte</h2>
      <p>
        Die Inhalte der App dürfen für das eigene Lernen genutzt werden. Die Lerndaten stammen teilweise aus offenen Quellen; deren Lizenzen
        stehen unter <Link to="/quellen">Quellen &amp; Lizenzen</Link>. <Fill>Umfang der Nutzungsrechte ausformulieren</Fill>
      </p>

      <h2>8. Haftung</h2>
      <p><Fill>Haftungsregelung ergänzen</Fill></p>

      <h2>9. Schlussbestimmungen</h2>
      <p>Es gilt deutsches Recht. Gegenüber Verbrauchern gilt dies nur, soweit zwingende Verbraucherschutzvorschriften des Aufenthaltsstaates nicht entzogen werden. <Fill>prüfen</Fill></p>
    </LegalPage>
  )
}
