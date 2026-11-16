/**
 * Vorlesen mit der Stimme des Geräts (Web Speech API, Japanisch).
 * Es werden bewusst KEINE Audiodateien verwendet – die früheren Stimmen durften nicht kommerziell genutzt werden.
 * TODO (docs/HANDOFF.md): eigene, lizenzierte Aufnahmen als bevorzugte Quelle ergänzen.
 */

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

function japaneseVoice(): SpeechSynthesisVoice | undefined {
  return speechSynthesis.getVoices().find((voice) => voice.lang.replace('_', '-').toLowerCase().startsWith('ja'))
}

/** Gibt es auf diesem Gerät eine japanische Stimme? (Manche Browser laden die Liste verzögert.) */
export function hasJapaneseVoice(): boolean {
  return canSpeak() && japaneseVoice() !== undefined
}

export function speak(text: string, { slow = false } = {}): void {
  if (!canSpeak()) return
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = slow ? 0.65 : 0.95
  const voice = japaneseVoice()
  if (voice) utterance.voice = voice
  speechSynthesis.speak(utterance)
}
