import { CHECKOUT_CONSENTS } from '../../../../shared/legal'
import { Fill, LegalPage } from './LegalPage'

export function Component() {
  return (
    <LegalPage title="Widerrufsbelehrung" updated="[BITTE AUSFÜLLEN]">
      <h2>Widerrufsrecht</h2>
      <p>Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.</p>
      <p>
        Um dein Widerrufsrecht auszuüben, musst du uns (<Fill>Name, Anschrift, E-Mail-Adresse</Fill>) mittels einer eindeutigen Erklärung
        (z. B. ein mit der Post versandter Brief oder eine E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst
        dafür das unten stehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
      </p>
      <p>Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.</p>

      <h2>Folgen des Widerrufs</h2>
      <p>
        Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, unverzüglich und spätestens binnen
        vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf bei uns eingegangen ist. Für diese Rückzahlung
        verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast; in keinem Fall werden dir wegen dieser
        Rückzahlung Entgelte berechnet.
      </p>
      <p>
        Hast du verlangt, dass die Dienstleistung während der Widerrufsfrist beginnen soll, so hast du uns einen angemessenen Betrag zu zahlen,
        der dem Anteil der bis zum Widerruf bereits erbrachten Leistungen im Vergleich zum Gesamtumfang entspricht.{' '}
        <Fill>Einordnung als Dienstleistung oder digitale Inhalte und daraus folgenden Wortlaut rechtlich prüfen</Fill>
      </p>

      <h2>Vorzeitiges Erlöschen des Widerrufsrechts</h2>
      <p>Beim Kauf bestätigst du ausdrücklich die folgenden beiden Punkte. Wir speichern, wann du zugestimmt hast.</p>
      <ul>
        <li>{CHECKOUT_CONSENTS.immediateStart}</li>
        <li>{CHECKOUT_CONSENTS.withdrawalExpires}</li>
      </ul>

      <h2>Muster-Widerrufsformular</h2>
      <p>(Wenn du den Vertrag widerrufen willst, fülle bitte dieses Formular aus und sende es zurück.)</p>
      <ul>
        <li>An <Fill>Name, Anschrift, E-Mail-Adresse</Fill>:</li>
        <li>Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung: Kotoba Dojo Pro</li>
        <li>Bestellt am (*)</li>
        <li>Name des/der Verbraucher(s)</li>
        <li>E-Mail-Adresse des Kontos</li>
        <li>Datum</li>
      </ul>
      <p>(*) Unzutreffendes streichen.</p>
    </LegalPage>
  )
}
