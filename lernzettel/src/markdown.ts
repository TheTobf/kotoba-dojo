import { Marked, Renderer, type Tokens, type TokenizerAndRendererExtension } from 'marked'
import markedKatex from 'marked-katex-extension'

export interface Abschnitt {
  id: string
  text: string
}

export interface Gerendert {
  html: string
  /** ##-Überschriften fürs Inhaltsverzeichnis */
  abschnitte: Abschnitt[]
  /** Anzahl der Checklisten-Punkte (- [ ] …) */
  haken: number
}

interface CalloutArt {
  titel: string
  icon: string
  klasse: string
  /** als aufklappbarer Kasten (z. B. Lösung) */
  zu?: boolean
}

const ARTEN: Record<string, CalloutArt> = {
  MERKE: { titel: 'Merke', icon: '💡', klasse: 'merke' },
  DEFINITION: { titel: 'Definition', icon: '📖', klasse: 'definition' },
  FORMEL: { titel: 'Formel', icon: '🧮', klasse: 'formel' },
  BEISPIEL: { titel: 'Beispiel', icon: '✏️', klasse: 'beispiel' },
  ACHTUNG: { titel: 'Achtung – typischer Fehler', icon: '⚠️', klasse: 'achtung' },
  TIPP: { titel: 'Klausurtipp', icon: '🎯', klasse: 'tipp' },
  AUFGABE: { titel: 'Aufgabe', icon: '📝', klasse: 'aufgabe' },
  LOESUNG: { titel: 'Lösung anzeigen', icon: '✅', klasse: 'loesung', zu: true },
  ZUSAMMENFASSUNG: { titel: 'Kurz & knapp', icon: '📌', klasse: 'zusammenfassung' },
}

const ALIAS: Record<string, string> = {
  LÖSUNG: 'LOESUNG',
  LOSUNG: 'LOESUNG',
  WICHTIG: 'MERKE',
  NOTE: 'MERKE',
  IMPORTANT: 'MERKE',
  INFO: 'MERKE',
  TIP: 'TIPP',
  WARNING: 'ACHTUNG',
  CAUTION: 'ACHTUNG',
  FEHLER: 'ACHTUNG',
  EXAMPLE: 'BEISPIEL',
  DEF: 'DEFINITION',
  REGEL: 'FORMEL',
  SATZ: 'FORMEL',
  UEBUNG: 'AUFGABE',
  ÜBUNG: 'AUFGABE',
  SELBSTTEST: 'AUFGABE',
  FAZIT: 'ZUSAMMENFASSUNG',
}

function calloutArt(name: string): string | undefined {
  const n = name.toUpperCase()
  const key = ALIAS[n] ?? n
  return ARTEN[key] ? key : undefined
}

interface CalloutToken extends Tokens.Generic {
  type: 'callout'
  art: string
  titelTokens: Tokens.Generic[]
  tokens: Tokens.Generic[]
}

/** GitHub-artige Kästen: „> [!MERKE] Titel“ + weitere „>“-Zeilen. */
const callout: TokenizerAndRendererExtension = {
  name: 'callout',
  level: 'block',
  start(src) {
    return /^ {0,3}>[ \t]?\[!/m.exec(src)?.index
  },
  tokenizer(src) {
    const m = /^ {0,3}>[ \t]?\[!([A-Za-zÄÖÜäöü]+)\][ \t]*([^\n]*)(?:\n|$)((?: {0,3}>[^\n]*(?:\n|$))*)/.exec(src)
    if (!m) return undefined
    const art = calloutArt(m[1])
    if (!art) return undefined
    const koerper = m[3].replace(/^ {0,3}>[ \t]?/gm, '')
    const token: CalloutToken = {
      type: 'callout',
      raw: m[0],
      art,
      titelTokens: this.lexer.inline(m[2].trim()),
      tokens: [],
    }
    this.lexer.blockTokens(koerper, token.tokens)
    return token
  },
  renderer(t) {
    const token = t as CalloutToken
    const art = ARTEN[token.art]
    const eigenerTitel = this.parser.parseInline(token.titelTokens)
    const titel = eigenerTitel || art.titel
    const inhalt = this.parser.parse(token.tokens)
    const kopf = `<span class="callout-icon" aria-hidden="true">${art.icon}</span><span>${titel}</span>`
    if (art.zu) {
      return `<details class="callout callout-${art.klasse}"><summary>${kopf}</summary><div class="callout-inhalt">${inhalt}</div></details>\n`
    }
    return `<div class="callout callout-${art.klasse}"><div class="callout-titel">${kopf}</div><div class="callout-inhalt">${inhalt}</div></div>\n`
  },
  childTokens: ['titelTokens', 'tokens'],
}

export function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'abschnitt'
  )
}

/** Überschriften-Text ohne Markdown-Zeichen */
function klar(raw: string): string {
  return raw.replace(/[*_`$\\]/g, '').replace(/\s+/g, ' ').trim()
}

const basis = new Renderer()

/** Markdown (mit Formeln, Kästen und Checklisten) → HTML */
export function rendere(md: string): Gerendert {
  const abschnitte: Abschnitt[] = []
  const ids = new Map<string, number>()
  let haken = 0

  const marked = new Marked(
    { gfm: true, breaks: false },
    markedKatex({ throwOnError: false, nonStandard: true, strict: 'ignore', output: 'htmlAndMathml' }),
    { extensions: [callout] },
    {
      renderer: {
        heading(token) {
          const text = klar(token.tokens.map((t) => t.raw).join(''))
          let id = `h-${slug(text)}`
          const n = ids.get(id) ?? 0
          ids.set(id, n + 1)
          if (n) id += `-${n + 1}`
          if (token.depth === 2) abschnitte.push({ id, text })
          return `<h${token.depth} id="${id}">${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`
        },
        checkbox() {
          return `<input type="checkbox" class="haken" data-haken="${haken++}" aria-label="abhaken"> `
        },
        listitem(item) {
          if (!item.task) return false
          return `<li class="haken-punkt">${this.parser.parse(item.tokens)}</li>\n`
        },
        list(token) {
          if (!token.items.some((i) => i.task)) return false
          let body = ''
          for (const item of token.items) body += this.listitem(item)
          return `<ul class="haken-liste">\n${body}</ul>\n`
        },
        table(token) {
          return `<div class="tabelle">${basis.table.call(this, token)}</div>\n`
        },
        link(token) {
          const html = basis.link.call(this, token)
          return /^https?:/i.test(token.href) ? html.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ') : html
        },
      },
    },
  )

  const html = marked.parse(md, { async: false })
  return { html, abschnitte, haken }
}
