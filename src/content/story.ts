/**
 * Story-Folgen mit ihren Lektionen (gratis).
 *
 * ⚠ PLATZHALTER: Diese zwei Folgen sind frei erfundene Beispiele, damit das Gerüst etwas zeigt.
 * Sie werden durch die echten Folgen aus TikTok ersetzt (siehe docs/HANDOFF.md). Jede Folge braucht nur
 * einen Eintrag in dieser Liste – Lektion, Karteikarten und Fortschritt entstehen daraus automatisch.
 */
import type { Phrase } from '../../shared/api'

export interface StorySentence extends Phrase {
  /** Kurze Erklärung auf Deutsch. */
  note: string
}

export interface Episode {
  id: string
  number: number
  title: string
  titleJa: string
  /** Worum es in der Folge geht (ohne Spoiler). */
  summary: string
  /** Link zur Folge, sobald es sie gibt. */
  videoUrl?: string
  sentences: StorySentence[]
}

export const EPISODES: Episode[] = [
  {
    id: 'folge-01',
    number: 1,
    title: 'Der erste Abend',
    titleJa: '最初の夜',
    summary: 'Lena kommt mit zwei Koffern in ihrer neuen WG in Tokio an – und muss sich zum ersten Mal auf Japanisch vorstellen.',
    sentences: [
      { ja: 'はじめまして。レナです。', kana: 'はじめまして。レナです。', romaji: 'Hajimemashite. Rena desu.', de: 'Freut mich. Ich bin Lena.', note: 'はじめまして sagt man nur beim allerersten Treffen. Name + です = „Ich bin …“.' },
      { ja: 'ドイツから来ました。', kana: 'ドイツからきました。', romaji: 'Doitsu kara kimashita.', de: 'Ich komme aus Deutschland.', note: 'から = „von/aus“. 来ました ist die höfliche Vergangenheit von 来る (kommen).' },
      { ja: 'よろしくお願いします。', kana: 'よろしくおねがいします。', romaji: 'Yoroshiku onegai shimasu.', de: 'Auf ein gutes Miteinander.', note: 'Feste Wendung nach dem Vorstellen. Wörtlich etwa: „Ich bitte um Wohlwollen.“' },
      { ja: '部屋はどこですか。', kana: 'へやはどこですか。', romaji: 'Heya wa doko desu ka.', de: 'Wo ist das Zimmer?', note: 'Muster: ○○はどこですか。 か am Ende macht den Satz zur Frage.' },
      { ja: '日本語は少しだけ話せます。', kana: 'にほんごはすこしだけはなせます。', romaji: 'Nihongo wa sukoshi dake hanasemasu.', de: 'Ich spreche nur ein bisschen Japanisch.', note: '少しだけ = „nur ein bisschen“. 話せます = „kann sprechen“ (Können-Form von 話す).' },
      { ja: 'お腹がすきました。', kana: 'おなかがすきました。', romaji: 'Onaka ga sukimashita.', de: 'Ich habe Hunger.', note: 'Wörtlich: „Der Bauch ist leer geworden.“ Hunger wird auf Japanisch als Zustand des Bauchs ausgedrückt.' },
    ],
  },
  {
    id: 'folge-02',
    number: 2,
    title: 'Im Café Komorebi',
    titleJa: 'カフェこもれび',
    summary: 'Am nächsten Morgen findet Lena ein kleines Café um die Ecke. Bestellen klappt – beim Bezahlen wird es spannend.',
    sentences: [
      { ja: 'コーヒーを一つください。', kana: 'コーヒーをひとつください。', romaji: 'Kōhī o hitotsu kudasai.', de: 'Einen Kaffee, bitte.', note: 'Muster zum Bestellen: ○○をください。 一つ (hitotsu) = „ein Stück“.' },
      { ja: 'これは何ですか。', kana: 'これはなんですか。', romaji: 'Kore wa nan desu ka.', de: 'Was ist das?', note: 'これ = „das hier“ (nah bei mir). Praktisch, wenn man auf etwas zeigt.' },
      { ja: 'おすすめは何ですか。', kana: 'おすすめはなんですか。', romaji: 'Osusume wa nan desu ka.', de: 'Was empfehlen Sie?', note: 'おすすめ = Empfehlung. Funktioniert in jedem Restaurant und Laden.' },
      { ja: 'とてもおいしいです。', kana: 'とてもおいしいです。', romaji: 'Totemo oishii desu.', de: 'Es ist sehr lecker.', note: 'とても = „sehr“. い-Adjektiv + です ist die höfliche Form.' },
      { ja: 'いくらですか。', kana: 'いくらですか。', romaji: 'Ikura desu ka.', de: 'Wie viel kostet das?', note: 'いくら = „wie viel (Geld)“.' },
      { ja: 'カードで払えますか。', kana: 'カードではらえますか。', romaji: 'Kādo de haraemasu ka.', de: 'Kann ich mit Karte zahlen?', note: 'で gibt das Mittel an („mit“). 払えます = „kann zahlen“.' },
    ],
  },
]

export const findEpisode = (id: string) => EPISODES.find((e) => e.id === id)
