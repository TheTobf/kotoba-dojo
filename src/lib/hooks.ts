/** Kleine React-Helfer zum Laden der Lerndaten und des lokalen Fortschritts. */
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import type { MistakeCard } from '../../shared/api'
import { loadData, type LearnData } from './data'
import { db, type CardState, type MissionProgress } from './db'
import { hasJapaneseVoice } from './speech'
import { startOfDay } from './srs'

/** Wörter und Sätze (werden einmal geladen und dann wiederverwendet). */
export function useLearnData(): { data?: LearnData; failed: boolean } {
  const [data, setData] = useState<LearnData>()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    loadData().then((d) => active && setData(d), () => active && setFailed(true))
    return () => { active = false }
  }, [])
  return { data, failed }
}

/** Alle Karten dieses Geräts – aktualisiert sich von selbst, sobald eine Karte bewertet wird. */
export const useCards = (): CardState[] | undefined => useLiveQuery(() => db.cards.toArray())

export const useMistakes = (): MistakeCard[] | undefined => useLiveQuery(() => db.mistakes.toArray())

export const useCompletedMissions = (): MissionProgress[] | undefined => useLiveQuery(() => db.missions.toArray())

export const useReviewedToday = (): number | undefined =>
  useLiveQuery(() => db.reviewLog.where('at').aboveOrEqual(startOfDay()).count())

/** Meldet, wenn das Gerät keine japanische Stimme hat (dann klingt Vorlesen falsch oder bleibt stumm). */
export function useMissingJapaneseVoice(): boolean {
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const check = () => setMissing(speechSynthesis.getVoices().length > 0 && !hasJapaneseVoice())
    check()
    speechSynthesis.addEventListener('voiceschanged', check)
    return () => speechSynthesis.removeEventListener('voiceschanged', check)
  }, [])
  return missing
}
