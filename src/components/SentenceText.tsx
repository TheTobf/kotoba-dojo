import type { Role, Sentence } from '../types'
import { hatStriche } from '../data'

const ROLE_CLS: Record<Role, string> = {
  subjekt: 'text-sky-500 dark:text-sky-300',
  objekt: 'text-amber-600 dark:text-amber-300',
  verb: 'text-rose-500 dark:text-rose-300',
  partikel: 'text-emerald-600 dark:text-emerald-300',
  sonst: '',
}

/** Text, in dem antippbare Kanji markiert sind (Tippen öffnet das Nachzeichnen). */
export function KanjiTippbar({ text, onKanji }: { text: string; onKanji?: (c: string) => void }) {
  if (!onKanji) return <>{text}</>
  return (
    <>
      {[...text].map((c, i) => hatStriche(c) ? (
        <span key={i} role="button" tabIndex={0} title="Antippen zum Nachzeichnen"
          onClick={(e) => { e.stopPropagation(); onKanji(c) }}
          className="cursor-pointer underline decoration-dotted decoration-1 underline-offset-[6px] hover:text-sakura">{c}</span>
      ) : <span key={i}>{c}</span>)}
    </>
  )
}

/** Japanischer Satz mit Furigana (ein-/ausblendbar), hervorgehobenem Zielwort und optionalen Rollenfarben. */
export default function SentenceText({ sentence, furigana = true, roles = false, hideTarget = false, className = '', onKanji }: {
  sentence: Sentence
  furigana?: boolean
  roles?: boolean
  hideTarget?: boolean
  className?: string
  onKanji?: (c: string) => void
}) {
  return (
    <p lang="ja" className={`leading-[2.4] ${className}`}>
      {sentence.tokens.map((t, i) => {
        const cls = t.target
          ? 'rounded-md bg-sakura/15 px-0.5 font-bold text-sakura underline decoration-2 underline-offset-8'
          : roles && t.role ? ROLE_CLS[t.role] : ''
        if (t.target && hideTarget) return <span key={i} className="mx-0.5 inline-block min-w-12 border-b-2 border-sakura">&nbsp;</span>
        return (
          <span key={i} className={cls}>
            {t.f
              ? t.f.map((f, j) =>
                  f.r ? (
                    <ruby key={j}>
                      <KanjiTippbar text={f.s} onKanji={onKanji} />
                      <rt className={`text-[0.5em] font-normal opacity-70 ${furigana ? '' : 'invisible'}`}>{f.r}</rt>
                    </ruby>
                  ) : (
                    <span key={j}>{f.s}</span>
                  ),
                )
              : t.s}
          </span>
        )
      })}
    </p>
  )
}
