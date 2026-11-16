/**
 * Platzhalter-KI: antwortet mit festen Sätzen, ohne dass irgendwo Kosten entstehen.
 * Sie verhält sich nach außen wie die spätere echte KI (Antwort, Hilfe auf Deutsch, Korrektur) und meldet
 * fiktive Kosten, damit Kontingent und Monatsbudget schon jetzt durchlaufen werden.
 */
import type { Correction, Phrase } from '../../shared/api'
import type { AiChatInput, AiChatOutput, AiProvider } from './provider'

export const REPLIES: Record<string, Phrase[]> = {
  haru: [
    { ja: 'はい、かしこまりました。', kana: 'はい、かしこまりました。', romaji: 'Hai, kashikomarimashita.', de: 'Ja, sehr gern.' },
    { ja: 'ホットとアイス、どちらにしますか。', kana: 'ホットとアイス、どちらにしますか。', romaji: 'Hotto to aisu, dochira ni shimasu ka.', de: 'Heiß oder kalt – was möchten Sie?' },
    { ja: 'ありがとうございます。少々お待ちください。', kana: 'ありがとうございます。しょうしょうおまちください。', romaji: 'Arigatō gozaimasu. Shōshō omachi kudasai.', de: 'Vielen Dank. Einen Moment bitte.' },
  ],
  sora: [
    { ja: 'へえ、いいね。', kana: 'へえ、いいね。', romaji: 'Hē, ii ne.', de: 'Oh, schön.' },
    { ja: '晩ごはん、何を食べたい？', kana: 'ばんごはん、なにをたべたい？', romaji: 'Bangohan, nani o tabetai?', de: 'Was möchtest du zu Abend essen?' },
    { ja: '週末、一緒に出かけない？', kana: 'しゅうまつ、いっしょにでかけない？', romaji: 'Shūmatsu, issho ni dekakenai?', de: 'Wollen wir am Wochenende zusammen etwas unternehmen?' },
  ],
}

/** Typische Anfängerfehler, an denen die Platzhalter-KI eine Korrektur vorführt. */
export const KNOWN_MISTAKES: { pattern: RegExp; better: Phrase; explanation: string }[] = [
  {
    pattern: /を好き|wo suki|o suki/i,
    better: { ja: 'コーヒーが好きです。', kana: 'コーヒーがすきです。', romaji: 'Kōhī ga suki desu.', de: 'Ich mag Kaffee.' },
    explanation: 'Bei 好き (mögen) steht が, nicht を: Das, was man mag, ist im Japanischen das Subjekt.',
  },
  {
    pattern: /に行きますた|ikimasuta/i,
    better: { ja: '東京に行きました。', kana: 'とうきょうにいきました。', romaji: 'Tōkyō ni ikimashita.', de: 'Ich bin nach Tokio gefahren.' },
    explanation: 'Die Vergangenheit von ます ist ました (nicht ますた).',
  },
]

export class MockProvider implements AiProvider {
  readonly isMock = true
  readonly maxCostMicroPerCall = 2_000 // 0,2 Cent – so viel wird je Aufruf höchstens reserviert

  async chat({ character, history, message, help }: AiChatInput): Promise<AiChatOutput> {
    const replies = REPLIES[character.id] ?? REPLIES.haru
    const turn = history.filter((t) => t.role === 'user').length
    const reply = replies[turn % replies.length]

    const mistake = KNOWN_MISTAKES.find((m) => m.pattern.test(message))
    const correction: Correction | undefined = mistake
      ? { original: message, better: mistake.better, explanation: mistake.explanation }
      : undefined

    return {
      reply,
      correction,
      help: help
        ? `Antworte ${character.name} mit einem kurzen, höflichen Satz. Zum Beispiel: はい、お願いします。 (Hai, onegai shimasu – „Ja, bitte.“) Das ist eine Platzhalter-Hilfe; die echte KI geht später auf dein Gespräch ein.`
        : undefined,
      costMicro: 500, // fiktive 0,05 Cent pro Antwort
    }
  }
}
