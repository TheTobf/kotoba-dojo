/**
 * Gespräch mit einer KI-Figur (Pro). Jede Nachricht geht an den eigenen Server (/api/ai/chat) –
 * der prüft Pro, Tageskontingent und Monatsbudget. Die Figur ist durchgehend als KI gekennzeichnet.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import type { ChatTurn, Correction, Phrase } from '../../../shared/api'
import { findCharacter, type Character } from '../../../shared/characters'
import { ProGate } from '../../features/ProGate'
import { api, ApiError, errorMessage } from '../../lib/api'
import { useAccount } from '../../lib/account'
import { syncMistakes } from '../../lib/srs'
import { PageHeader } from '../../layouts/AppLayout'
import { AiBadge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { cx } from '../../ui/cx'
import { Icon } from '../../ui/Icon'
import { JaText, SpeakButton } from '../../ui/JaText'
import { Notice } from '../../ui/Notice'

type Message =
  | { id: number; role: 'character'; phrase: Phrase }
  | { id: number; role: 'user'; text: string; correction?: Correction }
  | { id: number; role: 'help'; text: string }

function Bubble({ message, character }: { message: Message; character: Character }) {
  const [showTranslation, setShowTranslation] = useState(false)
  if (message.role === 'help') {
    return (
      <div className="rise mx-auto max-w-[90%] rounded-control border border-line bg-sunken px-4 py-3 text-sm">
        <p className="mb-1 flex items-center gap-1.5 font-semibold"><Icon name="hint" size={16} /> Hilfe</p>
        {message.text}
      </div>
    )
  }
  if (message.role === 'user') {
    return (
      <div className="rise flex flex-col items-end gap-2">
        <p lang="ja" className="max-w-[85%] rounded-card rounded-br-sm bg-accent px-4 py-2.5 text-on-accent">{message.text}</p>
        {message.correction && (
          <div className="max-w-[90%] rounded-control border border-warn/40 bg-warn-soft px-4 py-3 text-sm">
            <p className="font-semibold">Kleine Korrektur</p>
            <JaText phrase={message.correction.better} size="sm" showTranslation className="mt-1.5" />
            <p className="mt-2">{message.correction.explanation}</p>
            <p className="mt-2 flex items-center gap-1.5 text-ink-soft"><Icon name="cards" size={16} /> Als Karteikarte gespeichert</p>
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="rise flex max-w-[90%] flex-col items-start gap-1.5">
      <p className="flex items-center gap-2 text-xs text-ink-soft">{character.name} <AiBadge /></p>
      <div className="rounded-card rounded-bl-sm border border-line bg-surface px-4 py-3">
        <JaText phrase={message.phrase} size="md" showTranslation={showTranslation} />
      </div>
      <div className="flex items-center gap-3">
        <SpeakButton text={message.phrase.ja} />
        {!showTranslation && (
          <button type="button" className="text-sm text-ink-soft underline hover:text-ink" onClick={() => setShowTranslation(true)}>Übersetzung</button>
        )}
      </div>
    </div>
  )
}

function Conversation({ character }: { character: Character }) {
  const { me, refresh } = useAccount()
  const nextId = useRef(1)
  const [messages, setMessages] = useState<Message[]>([{ id: 0, role: 'character', phrase: character.greeting }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [quota, setQuota] = useState(me?.ai ?? undefined)
  const [mock, setMock] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const history = (): ChatTurn[] =>
    messages.flatMap((m): ChatTurn[] =>
      m.role === 'character' ? [{ role: 'character', text: m.phrase.ja }] : m.role === 'user' ? [{ role: 'user', text: m.text }] : [],
    )

  async function send(text: string, help: boolean) {
    setBusy(true)
    setError(undefined)
    const userId = nextId.current++
    const previous = history()
    if (!help) setMessages((list) => [...list, { id: userId, role: 'user', text }])
    try {
      const response = await api.chat({ characterId: character.id, history: previous, message: text, help })
      setQuota(response.quota)
      setMock(response.mock)
      setMessages((list) => {
        const updated = list.map((m) => (m.id === userId && m.role === 'user' ? { ...m, correction: response.correction } : m))
        return help
          ? [...updated, { id: nextId.current++, role: 'help', text: response.help ?? 'Antworte mit einem kurzen Satz.' }]
          : [...updated, { id: nextId.current++, role: 'character', phrase: response.reply }]
      })
      if (response.correction) void syncMistakes().catch(() => undefined)
      if (!help) setInput('')
    } catch (e) {
      if (!help) setMessages((list) => list.filter((m) => m.id !== userId))
      // Pro ist inzwischen abgelaufen: Konto-Stand neu laden, dann erscheint der Upgrade-Screen.
      if (e instanceof ApiError && (e.code === 'pro_noetig' || e.code === 'nicht_angemeldet')) void refresh()
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (text && !busy) void send(text, false)
  }

  return (
    <>
      <PageHeader title={character.name} lead={character.role} back={{ to: '/app/sprechen', label: 'Sprechen' }} />
      <Notice className="mb-6">
        <span className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0"><Icon name="robot" size={18} /></span>
          <span>
            {character.name} ist eine <strong>KI-Figur</strong>, kein echter Mensch. Antworten können Fehler enthalten.
            {mock && ' Aktuell antwortet eine Platzhalter-KI mit festen Sätzen – die echte KI folgt.'}
          </span>
        </span>
      </Notice>

      <div className="space-y-5" aria-live="polite">
        {messages.map((message) => <Bubble key={message.id} message={message} character={character} />)}
        {busy && <p className="text-sm text-ink-soft">{character.name} schreibt …</p>}
        <div ref={end} />
      </div>

      {error && <Notice tone="error" className="mt-5">{error}</Notice>}

      <form onSubmit={submit} className={cx('sticky bottom-20 mt-6 rounded-card border border-line bg-paper/95 p-3 backdrop-blur md:bottom-4')}>
        <label htmlFor="chat-input" className="sr-only">Deine Nachricht auf Japanisch</label>
        <div className="flex gap-2">
          <input
            id="chat-input" lang="ja" autoComplete="off" spellCheck={false} maxLength={300} value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Schreib auf Japanisch …"
            className="min-h-12 w-full min-w-0 rounded-control border border-line bg-surface px-4 transition-colors hover:border-ink-soft focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none"
          />
          <Button type="submit" variant="primary" loading={busy} disabled={!input.trim()}>Senden</Button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void send('？', true)}>
            <Icon name="hint" size={18} /> Ich weiß nicht weiter
          </Button>
          {quota && <p className="text-xs text-ink-soft tabular-nums">{quota.usedToday} / {quota.dailyLimit} heute</p>}
        </div>
      </form>
    </>
  )
}

export function Component() {
  const { characterId = '' } = useParams()
  const character = findCharacter(characterId)
  if (!character) {
    return <><PageHeader title="Figur nicht gefunden" back={{ to: '/app/sprechen', label: 'Sprechen' }} /><Notice>Diese Figur gibt es nicht.</Notice></>
  }
  return (
    <ProGate title={`Mit ${character.name} sprechen`} lead="Gespräche mit KI-Figuren gehören zu Pro: frei schreiben, auf Deutsch korrigiert werden, Fehler automatisch als Karteikarten.">
      <Conversation key={character.id} character={character} />
    </ProGate>
  )
}
