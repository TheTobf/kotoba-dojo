/**
 * Japanischer Text mit Lesehilfen: Furigana über Kanji, darunter Kana und Romaji (je nach Einstellung)
 * und optional die deutsche Übersetzung. Dazu der Vorlesen-Knopf.
 */
import type { Phrase } from '../../shared/api'
import type { Token } from '../lib/data'
import { useSettings } from '../lib/settings'
import { canSpeak, speak } from '../lib/speech'
import { IconButton } from './Button'
import { cx } from './cx'
import { Icon } from './Icon'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const SIZES: Record<Size, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl sm:text-3xl',
  xl: 'text-4xl sm:text-5xl',
}

/**
 * Rollen im Satz, ohne zusätzliche Farben: Thema/Subjekt durchgezogen unterstrichen, Objekt gestrichelt,
 * Verb in der Akzentfarbe, Partikeln blasser. Erklärt in <RoleLegend>.
 */
const ROLE_CLASS: Record<string, string> = {
  subjekt: 'underline decoration-2 underline-offset-[6px] decoration-ink-soft',
  objekt: 'underline decoration-dashed decoration-2 underline-offset-[6px] decoration-ink-soft',
  verb: 'text-accent',
  partikel: 'text-ink-soft',
}

export function RoleLegend() {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
      <span><span className="underline decoration-2 underline-offset-4">Thema/Subjekt</span></span>
      <span><span className="underline decoration-dashed decoration-2 underline-offset-4">Objekt</span></span>
      <span><span className="text-accent">Verb/Adjektiv</span></span>
      <span>Partikel (blass)</span>
    </p>
  )
}

/** Satz mit Furigana (kleine Lesung über den Kanji). Das Zielwort ist dezent markiert. */
export function Furigana({ tokens, showReading, hideTarget = false, roles = false, gapAt }: {
  tokens: Token[]
  showReading: boolean
  hideTarget?: boolean
  /** Rollen markieren (Satzbau, Grammatik). */
  roles?: boolean
  /** Lücke an dieser Stelle (Partikel-Übung). */
  gapAt?: number
}) {
  return (
    <>
      {tokens.map((token, i) => (token.target && hideTarget) || gapAt === i ? (
        <span key={i} aria-label="Lücke" className="mx-1 inline-block min-w-12 border-b-2 border-accent align-baseline">&nbsp;</span>
      ) : (
        <span key={i} className={cx(roles ? token.role && ROLE_CLASS[token.role] : token.target && 'text-accent')}>
          {token.f
            ? token.f.map((part, j) =>
                part.r ? (
                  <ruby key={j}>
                    {part.s}
                    <rt className={cx('text-[0.45em] text-ink-soft', !showReading && 'invisible')}>{part.r}</rt>
                  </ruby>
                ) : (
                  <span key={j}>{part.s}</span>
                ),
              )
            : token.s}
        </span>
      ))}
    </>
  )
}

export function SpeakButton({ text, className }: { text: string; className?: string }) {
  if (!canSpeak()) return null
  return (
    <span className={cx('inline-flex gap-2', className)}>
      <IconButton label="Vorlesen" onClick={(e) => { e.stopPropagation(); void speak(text) }}>
        <Icon name="sound" />
      </IconButton>
      <IconButton label="Langsam vorlesen" onClick={(e) => { e.stopPropagation(); void speak(text, { slow: true }) }}>
        <Icon name="slow" />
      </IconButton>
    </span>
  )
}

export function JaText({
  phrase, tokens, size = 'md', showTranslation = false, align = 'left', className, hideTarget = false, roles = false, gapAt,
}: {
  roles?: boolean
  gapAt?: number
  phrase: Phrase
  tokens?: Token[]
  /** Zielwort als Lücke zeigen (Quiz). Blendet auch Kana und Romaji aus, damit nichts verraten wird. */
  hideTarget?: boolean
  size?: Size
  showTranslation?: boolean
  align?: 'left' | 'center'
  className?: string
}) {
  const { showKana, showRomaji } = useSettings()
  const hasFurigana = tokens?.some((t) => t.f?.some((f) => f.r))
  // Kana-Zeile nur, wenn sie etwas Neues zeigt (nicht bei reinem Kana-Text und nicht zusätzlich zu Furigana).
  const kanaLine = showKana && !hasFurigana && phrase.kana !== phrase.ja
  return (
    <div className={cx(align === 'center' && 'text-center', className)}>
      <p lang="ja" className={cx('font-display leading-snug', hasFurigana && 'leading-[2.1]', SIZES[size])}>
        {tokens?.length ? <Furigana tokens={tokens} showReading={showKana} hideTarget={hideTarget} roles={roles} gapAt={gapAt} /> : phrase.ja}
      </p>
      {kanaLine && !hideTarget && gapAt === undefined && <p lang="ja" className="mt-1 text-ink-soft">{phrase.kana}</p>}
      {showRomaji && !hideTarget && gapAt === undefined && <p lang="ja-Latn" className="mt-0.5 text-sm text-ink-soft">{phrase.romaji}</p>}
      {showTranslation && <p className="mt-2">{phrase.de}</p>}
    </div>
  )
}
