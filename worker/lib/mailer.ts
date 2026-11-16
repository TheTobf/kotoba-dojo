/**
 * E-Mail-Versand als austauschbare Schnittstelle. Vorerst gibt es nur den Platzhalter `ConsoleMailer`.
 * TODO (docs/HANDOFF.md): echten Versand anschließen, z. B. Brevo (Sitz in der EU, Gratis-Kontingent).
 */
import { isDevelopment, type Env } from '../env'

export interface Mail {
  to: string
  subject: string
  text: string
}

export interface Mailer {
  send(mail: Mail): Promise<void>
}

/** Verschickt nichts. Lokal landet die Mail in der Konsole; in Produktion wird nur gewarnt (ohne Inhalt). */
export class ConsoleMailer implements Mailer {
  constructor(private readonly showContent: boolean) {}

  async send(mail: Mail): Promise<void> {
    if (this.showContent) {
      console.log(`\n✉  [Platzhalter-Mail] An: ${mail.to}\n   Betreff: ${mail.subject}\n   ${mail.text.replace(/\n/g, '\n   ')}\n`)
    } else {
      console.warn('Mailversand ist noch nicht eingerichtet – eine E-Mail wurde NICHT verschickt.')
    }
  }
}

export function createMailer(env: Env): Mailer {
  return new ConsoleMailer(isDevelopment(env))
}
