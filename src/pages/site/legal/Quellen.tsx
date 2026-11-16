/** Quellen und Lizenzen der Lerndaten. Namensnennung ist bei diesen Lizenzen Pflicht – deshalb steht sie in der App. */
export function Component() {
  return (
    <div className="mx-auto max-w-site px-5 py-8 sm:px-8 md:py-14">
      <article className="prose-kd">
        <h1 className="text-3xl sm:text-4xl">Quellen &amp; Lizenzen</h1>
        <p className="mt-4">Kotoba Dojo baut auf offenen Sprachdaten auf. Danke an alle, die sie pflegen.</p>

        <h2>Wörterbuch</h2>
        <p>
          Lesungen, Wortarten und Bedeutungen basieren auf <a href="https://www.edrdg.org/jmdict/j_jmdict.html" rel="noreferrer">JMdict</a>{' '}
          der Electronic Dictionary Research and Development Group (EDRDG), Lizenz{' '}
          <a href="https://www.edrdg.org/edrdg/licence.html" rel="noreferrer">CC BY-SA 4.0</a>. Die deutschen Kurzbedeutungen wurden auf dieser
          Grundlage mit KI-Unterstützung formuliert.
        </p>

        <h2>Beispielsätze</h2>
        <p>
          Ein großer Teil der Beispielsätze und Übersetzungen stammt von <a href="https://tatoeba.org" rel="noreferrer">Tatoeba</a>, Lizenz{' '}
          <a href="https://creativecommons.org/licenses/by/2.0/fr/" rel="noreferrer">CC BY 2.0 FR</a>. Fehlende Sätze, Übersetzungen und alle
          Grammatik-Notizen wurden mit KI-Unterstützung geschrieben.
        </p>

        <h2>Wortreihenfolge</h2>
        <p>Die Häufigkeitsliste stammt aus dem Japanese Internet Corpus von Serge Sharoff (University of Leeds), Lizenz CC BY.</p>

        <h2>Weitergabe der Daten</h2>
        <p>
          Weil JMdict unter CC BY-SA steht, stehen auch die daraus abgeleiteten Lerndaten dieser App (Wort- und Satzlisten) unter{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.de" rel="noreferrer">CC BY-SA 4.0</a>. Der Programmcode ist davon nicht betroffen.
        </p>

        <h2>Schriften</h2>
        <p>Noto Sans JP und Noto Serif JP (Google), SIL Open Font License 1.1. Die Schriften liegen auf unserem eigenen Server.</p>

        <h2>Vorlesen</h2>
        <p>Vorgelesen wird mit der Sprachausgabe deines Geräts. Kotoba Dojo liefert derzeit keine eigenen Sprachaufnahmen aus.</p>

        <h2>Software</h2>
        <p>
          Unter anderem React, Vite, Tailwind CSS, Hono, Dexie, ts-fsrs und WanaKana (jeweils MIT-Lizenz). Die vollständige Liste steht in der
          Datei LICENSES.md des Projekts.
        </p>
      </article>
    </div>
  )
}
