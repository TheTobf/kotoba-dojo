import { KLEINUNTERNEHMER } from '../../../../shared/plans'
import { Fill, LegalPage } from './LegalPage'

export function Component() {
  return (
    <LegalPage title="Impressum" updated="[BITTE AUSFÜLLEN]">
      <h2>Angaben gemäß § 5 DDG</h2>
      <address>
        <Fill>Vor- und Nachname bzw. Firma</Fill><br />
        <Fill>Straße und Hausnummer (ladungsfähige Anschrift, kein Postfach)</Fill><br />
        <Fill>PLZ und Ort</Fill><br />
        Deutschland
      </address>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <Fill>E-Mail-Adresse</Fill><br />
        Telefon: <Fill>Telefonnummer (oder anderer schneller Kontaktweg)</Fill>
      </p>

      <h2>Umsatzsteuer</h2>
      {KLEINUNTERNEHMER ? (
        <p>Als Kleinunternehmer im Sinne von § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet und ausgewiesen.</p>
      ) : (
        <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: <Fill>USt-IdNr.</Fill></p>
      )}

      <h2>Verantwortlich für den Inhalt (§ 18 Abs. 2 MStV)</h2>
      <p><Fill>Name und Anschrift wie oben</Fill></p>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.{' '}
        <Fill>Aussage prüfen und ggf. anpassen</Fill>
      </p>
    </LegalPage>
  )
}
