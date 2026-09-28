/**
 * Ziele: Was kann ich in Japan schon? Und welche Medien sind in Reichweite?
 * `words` sind Schreibweisen (Word.surface) aus dem Kurs – ein Test prüft, dass es sie gibt.
 * Die Wortschwellen bei Medien sind grobe Schätzungen, keine Messung.
 */

/** Reisebeginn laut Obsidian-Notiz „Japan-Reise 2027“ (noch nicht fix). */
export const REISE_START = '2027-09-25'

export interface Situation {
  id: string
  icon: string
  title: string
  canDo: string        // Was du dann kannst
  phrase: { ja: string; de: string }
  words: string[]
  minWords?: number    // zusätzlich nötiger Gesamtwortschatz (für freiere Gespräche)
}

export const SITUATIONEN: Situation[] = [
  {
    id: 'gruessen', icon: '🙇', title: 'Grüßen & danken',
    canDo: 'Leute höflich grüßen, dich bedanken und entschuldigen.',
    phrase: { ja: 'すみません、ありがとうございます。', de: 'Entschuldigung, vielen Dank.' },
    words: ['はい', 'いいえ', 'すみません', 'ありがとう', 'こんにちは', 'おはよう', 'こんばんは', 'さようなら'],
  },
  {
    id: 'vorstellen', icon: '🙋', title: 'Dich vorstellen',
    canDo: 'Sagen, wer du bist, woher du kommst und ob du etwas verstehst.',
    phrase: { ja: '私はドイツから来ました。', de: 'Ich komme aus Deutschland.' },
    words: ['私', '名前', 'ドイツ', '日本', '日本語', '英語', 'わかる', '大丈夫'],
  },
  {
    id: 'preis', icon: '💴', title: 'Preise verstehen & bezahlen',
    canDo: 'Nach dem Preis fragen, Zahlen verstehen, bar oder mit Karte zahlen.',
    phrase: { ja: 'これはいくらですか。', de: 'Wie viel kostet das?' },
    words: ['これ', 'それ', 'いくら', '円', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万', 'カード', 'お金'],
  },
  {
    id: 'zeit', icon: '🕒', title: 'Uhrzeit & Tage',
    canDo: 'Nach der Uhrzeit fragen und über heute, morgen und gestern reden.',
    phrase: { ja: '今、何時ですか。', de: 'Wie spät ist es jetzt?' },
    words: ['時', '分', '何時', '今日', '明日', '昨日', '朝', '昼', '夜', '今'],
  },
  {
    id: 'weg', icon: '🗺️', title: 'Nach dem Weg fragen',
    canDo: 'Fragen, wo etwas ist, und einfache Wegbeschreibungen verstehen.',
    phrase: { ja: '駅はどこですか。', de: 'Wo ist der Bahnhof?' },
    words: ['どこ', 'ここ', 'そこ', 'あれ', 'トイレ', '駅', '右', '左', 'まっすぐ', '近い', '遠い', '地図', '道', '入口', '出口'],
  },
  {
    id: 'verkehr', icon: '🚃', title: 'Zug, Bus & Taxi',
    canDo: 'Tickets kaufen, den richtigen Zug finden und dem Taxi dein Ziel sagen.',
    phrase: { ja: '空港までお願いします。', de: 'Zum Flughafen, bitte.' },
    words: ['電車', '地下鉄', 'バス', 'タクシー', '切符', '空港', '飛行機', '行く', '来る', '帰る', '待つ', 'お願い'],
  },
  {
    id: 'hotel', icon: '🏨', title: 'Hotel & Ryokan',
    canDo: 'Einchecken, nach dem Zimmer fragen und dein Gepäck abgeben.',
    phrase: { ja: '予約があります。', de: 'Ich habe eine Reservierung.' },
    words: ['ホテル', '旅館', '予約', '部屋', '鍵', '荷物', 'パスポート', '階', 'エレベーター', '名前'],
  },
  {
    id: 'restaurant', icon: '🍜', title: 'Im Restaurant bestellen',
    canDo: 'Essen und Getränke bestellen, nach der Rechnung fragen und dich richtig bedanken.',
    phrase: { ja: 'ビールを一つください。', de: 'Ein Bier, bitte.' },
    words: ['レストラン', 'メニュー', '注文', '水', 'お茶', 'コーヒー', 'ビール', 'ご飯', '肉', '魚', '野菜', 'くださる', '箸', '会計', 'いただきます', 'ごちそうさま', 'おいしい', '食べる', '飲む'],
  },
  {
    id: 'einkaufen', icon: '🏪', title: 'Konbini & Shopping',
    canDo: 'Im Konbini oder Laden einkaufen, Tüte ablehnen, nach Größen fragen.',
    phrase: { ja: '袋はいりません。', de: 'Ich brauche keine Tüte.' },
    words: ['店', 'コンビニ', '買う', '高い', '安い', '財布', '両替', '袋', 'レシート', '無料', 'サイズ', 'いる'],
  },
  {
    id: 'sightseeing', icon: '⛩️', title: 'Sightseeing & Fotos',
    canDo: 'Tempel, Schreine und Onsen besuchen, Öffnungszeiten verstehen, um ein Foto bitten.',
    phrase: { ja: '写真を撮ってもいいですか。', de: 'Darf ich ein Foto machen?' },
    words: ['観光', '神社', '寺', '温泉', '山', '海', '写真', '撮る', '見る', '綺麗', '美しい', '閉まる', '禁止'],
  },
  {
    id: 'notfall', icon: '🚑', title: 'Notfall & Gesundheit',
    canDo: 'Um Hilfe bitten, sagen was wehtut, Krankenhaus oder Polizei finden.',
    phrase: { ja: '助けてください！', de: 'Helfen Sie mir, bitte!' },
    words: ['病院', '薬', '警察', '助ける', '痛い', '危ない', '大丈夫'],
  },
  {
    id: 'wetter', icon: '☀️', title: 'Smalltalk übers Wetter',
    canDo: 'Das klassische Gesprächsthema: Wetter, Hitze, Regen.',
    phrase: { ja: '今日は暑いですね。', de: 'Heute ist es heiß, nicht wahr?' },
    words: ['天気', '雨', '暑い', '寒い', '今日', 'いい', '本当'],
  },
  {
    id: 'izakaya', icon: '🍻', title: 'Zusammen trinken im Izakaya',
    canDo: 'Anstoßen, nachbestellen und sagen, was dir schmeckt und Spaß macht.',
    phrase: { ja: '乾杯！すごく楽しいです。', de: 'Prost! Das macht richtig Spaß.' },
    words: ['乾杯', '酒', 'ビール', '飲む', 'もう', '一緒', '友達', '楽しい', 'すごい', 'おいしい', '好き'],
    minWords: 400,
  },
  {
    id: 'kennenlernen', icon: '🤝', title: 'Einheimische kennenlernen',
    canDo: 'Einfache Gespräche: woher, was du arbeitest, was dir gefällt, wie lange du bleibst.',
    phrase: { ja: '日本が大好きです。二週間います。', de: 'Ich liebe Japan. Ich bleibe zwei Wochen.' },
    words: ['仕事', '好き', '家族', '国', '週', '住む', '初めて', '趣味', '音楽', '映画', '旅行', '思う', 'どう', '何'],
    minWords: 700,
  },
  {
    id: 'erzaehlen', icon: '💬', title: 'Von deiner Reise erzählen',
    canDo: 'Erzählen, was du gestern gemacht hast und was du noch vorhast.',
    phrase: { ja: '昨日、京都でお寺を見ました。', de: 'Gestern habe ich in Kyoto Tempel angeschaut.' },
    words: ['昨日', '明日', '行く', '見る', '食べる', '次', '前', '後', 'また', '面白い', '思う', '言う'],
    minWords: 1100,
  },
  {
    id: 'plaudern', icon: '🏮', title: 'Einen Abend lang plaudern',
    canDo: 'Mit Einheimischen zusammensitzen und dem Gespräch grob folgen – auch wenn nicht jedes Wort sitzt.',
    phrase: { ja: 'もう少しゆっくり話してください。', de: 'Bitte sprich etwas langsamer.' },
    words: ['話す', '聞く', 'ゆっくり', '少し', 'もう一度', '意味', 'わかる', '言う'],
    minWords: 1800,
  },
]

export type MedienArt = 'Podcast' | 'YouTube' | 'Anime' | 'Manga' | 'Lesen'

export interface Medium {
  id: string
  art: MedienArt
  title: string
  note: string        // worum es geht / wie anfangen
  url: string
  minWords: number    // geschätzte Schwelle
}

const yt = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`

export const MEDIEN: Medium[] = [
  { id: 'cij', art: 'YouTube', title: 'Comprehensible Japanese (Complete Beginner)', minWords: 60,
    note: 'Sehr langsames Japanisch mit Bildern und Gesten – fang mit den „Complete Beginner“-Videos an.',
    url: 'https://cijapanese.com' },
  { id: 'tadoku0', art: 'Lesen', title: 'Tadoku Graded Readers – Level 0', minWords: 120,
    note: 'Kostenlose Mini-Bücher mit Bildern, fast nur Wörter aus deinem Anfangswortschatz.',
    url: 'https://tadoku.org/japanese/en/free-books-en/' },
  { id: 'teppei-b', art: 'Podcast', title: 'Nihongo con Teppei for Beginners', minWords: 250,
    note: 'Kurze Folgen (3–5 Min), einfache Alltagsthemen. Starte bei Folge 1.',
    url: 'https://open.spotify.com/search/Nihongo%20con%20Teppei%20for%20beginners' },
  { id: 'chiikawa', art: 'Manga', title: 'ちいかわ (Chiikawa)', minWords: 300,
    note: 'Niedlicher Manga mit sehr wenig Text – gut für die ersten Erfolgserlebnisse.',
    url: yt('ちいかわ アニメ 1話') },
  { id: 'shimajiro', art: 'Anime', title: 'しまじろう (Shimajirō)', minWords: 400,
    note: 'Kinder-Anime mit klarer, langsamer Sprache.',
    url: yt('しまじろう アニメ') },
  { id: 'chi', art: 'Anime', title: 'チーズスイートホーム (Chi’s Sweet Home)', minWords: 500,
    note: '3-Minuten-Folgen über ein Kätzchen, viel Kindersprache.',
    url: yt('チーズスイートホーム 1話') },
  { id: 'tadoku2', art: 'Lesen', title: 'Tadoku Graded Readers – Level 1–2', minWords: 600,
    note: 'Längere Geschichten, weiterhin mit Furigana.',
    url: 'https://tadoku.org/japanese/en/free-books-en/' },
  { id: 'yotsuba', art: 'Manga', title: 'よつばと! (Yotsuba&!)', minWords: 800,
    note: 'Alltag eines neugierigen Mädchens – Klassiker für Lernende, Band 1.',
    url: 'https://www.google.com/search?q=%E3%82%88%E3%81%A4%E3%81%B0%E3%81%A8+1%E5%B7%BB' },
  { id: 'teppei', art: 'Podcast', title: 'Nihongo con Teppei (normal)', minWords: 900,
    note: 'Die „große“ Version: natürliches Tempo, aber immer noch alltagsnah.',
    url: 'https://open.spotify.com/search/Nihongo%20con%20Teppei' },
  { id: 'doraemon', art: 'Anime', title: 'ドラえもん (Doraemon)', minWords: 1000,
    note: 'Kinder-Anime mit Alltagssprache – ideal zum Hörtraining.',
    url: yt('ドラえもん 日本語') },
  { id: 'shirokuma', art: 'Anime', title: 'しろくまカフェ (Shirokuma Café)', minWords: 1200,
    note: 'Ruhiger Slice-of-Life-Anime, viel Café-Smalltalk – passt zur Reise.',
    url: yt('しろくまカフェ 1話') },
  { id: 'totoro', art: 'Anime', title: 'となりのトトロ (Mein Nachbar Totoro)', minWords: 1400,
    note: 'Ghibli-Film mit einfacher Sprache – am besten mit japanischen Untertiteln.',
    url: 'https://www.google.com/search?q=%E3%81%A8%E3%81%AA%E3%82%8A%E3%81%AE%E3%83%88%E3%83%88%E3%83%AD' },
  { id: 'yuyu', art: 'Podcast', title: 'YUYUの日本語Podcast', minWords: 1700,
    note: 'Mittelstufe: Kultur, Alltag und Sprache, komplett auf Japanisch.',
    url: 'https://open.spotify.com/search/YUYU%E3%81%AE%E6%97%A5%E6%9C%AC%E8%AA%9EPodcast' },
  { id: 'kiki', art: 'Anime', title: '魔女の宅急便 (Kikis kleiner Lieferservice)', minWords: 2000,
    note: 'Dein Ziel zum Kursende: ein ganzer Ghibli-Film.',
    url: 'https://www.google.com/search?q=%E9%AD%94%E5%A5%B3%E3%81%AE%E5%AE%85%E6%80%A5%E4%BE%BF' },
]
