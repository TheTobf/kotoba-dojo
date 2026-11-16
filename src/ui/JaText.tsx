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

/** Satz mit Furigana (kleine Lesung über den Kanji). Das Zielwort ist dezent markiert. */
export function Furigana({ tokens, showReading }: { tokens: Token[]; showReading: boolean }) {
  return (
    <>
      {tokens.map((token, i) => (
        <span key={i} className={cx(token.target && 'text-accent')}>
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
      <IconButton label="Vorlesen" onClick={(e) => { e.stopPropagation(); speak(text) }}>
        <Icon name="sound" />
      </IconButton>
      <IconButton label="Langsam vorlesen" onClick={(e) => { e.stopPropagation(); speak(text, { slow: true }) }}>
        <Icon name="slow" />
      </IconButton>
    </span>
  )
}

export function JaText({
  phrase, tokens, size = 'md', showTranslation = false, align = 'left', className,
}: {
  phrase: Phrase
  tokens?: Token[]
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
        {tokens?.length ? <Furigana tokens={tokens} showReading={showKana} /> : phrase.ja}
      </p>
      {kanaLine && <p lang="ja" className="mt-1 text-ink-soft">{phrase.kana}</p>}
      {showRomaji && <p lang="ja-Latn" className="mt-0.5 text-sm text-ink-soft">{phrase.romaji}</p>}
      {showTranslation && <p className="mt-2">{phrase.de}</p>}
    </div>
  )
}
