/**
 * Kurze Grammatik-Lektionen auf Deutsch. Die Beispiele sucht die App selbst aus ihren Sätzen (`pattern`),
 * gelernte Wörter zuerst. Texte aus der privaten App übernommen.
 */
export interface Lesson {
  id: string
  title: string
  ja: string
  /** Kurze Absätze. */
  text: string[]
  /** Merkformel. */
  formula?: string
  /** Findet passende Beispielsätze. */
  pattern: RegExp
}

export const GRAMMAR: Lesson[] = [
  {
    id: 'sov', title: 'Satzstellung: das Verb kommt zum Schluss', ja: '語順',
    formula: 'Thema は – Objekt を – Verb',
    text: [
      'Deutsch: Ich trinke Kaffee. Japanisch: Ich – Kaffee – trinke. Das Verb (oder Adjektiv/です) steht fast immer ganz am Ende.',
      'Die Partikeln hinter den Wörtern zeigen ihre Rolle an. Deshalb ist die Reihenfolge davor recht frei – nur das Ende bleibt fest.',
    ],
    pattern: /を.{1,6}(ます|る|た)。$/,
  },
  {
    id: 'wa', title: 'は – das Thema des Satzes', ja: 'は',
    formula: 'X は Y です = Was X angeht: Y',
    text: [
      'は (gesprochen „wa“) markiert, worüber du redest. Oft entspricht es dem deutschen Subjekt, aber eigentlich heißt es „was … betrifft“.',
      'Typisch: 私は ドイツ人です。 – Ich bin Deutscher.',
    ],
    pattern: /^[^。]{1,6}は.+です。$/,
  },
  {
    id: 'ga', title: 'が – wer oder was (neu/betont)', ja: 'が',
    formula: 'X が 好き / ある / いる / わかる',
    text: [
      'が markiert das Subjekt, wenn es neu oder betont ist: „Wer? – ICH!“',
      'Feste Verbindungen: 〜が好き (mögen), 〜がある/いる (es gibt), 〜がわかる (verstehen).',
    ],
    pattern: /が(好き|ある|あり|いる|い|わかる|わかり)/,
  },
  {
    id: 'wo', title: 'を – das direkte Objekt', ja: 'を',
    formula: 'X を + Verb',
    text: ['を (gesprochen „o“) steht hinter dem, was „behandelt“ wird: Kaffee trinken, ein Buch lesen, einen Film sehen.'],
    pattern: /を(飲|食|見|読|買|書|聞)/,
  },
  {
    id: 'ni', title: 'に – Ziel, Zeitpunkt, Ort des Seins', ja: 'に',
    formula: 'Ort に 行く · 7時 に · Ort に いる',
    text: [
      'に zeigt ein Ziel (nach/zu), einen genauen Zeitpunkt (um 7 Uhr) oder wo sich etwas befindet (mit いる/ある).',
      'へ (gesprochen „e“) ist ähnlich wie „nach“ – betont mehr die Richtung.',
    ],
    pattern: /に(行|来|帰|いる|い|ある|あり)/,
  },
  {
    id: 'de', title: 'で – Ort der Handlung, Mittel', ja: 'で',
    formula: 'Ort で + Handlung · Bus で 行く',
    text: ['で = wo etwas passiert (im Restaurant essen) oder womit (mit dem Bus, auf Japanisch).'],
    pattern: /(で(食|飲|働|勉強|買|会)|(バス|電車|日本語|英語)で)/,
  },
  {
    id: 'no', title: 'の – Besitz und Verbindung', ja: 'の',
    formula: 'A の B = B von A / As B',
    text: ['の verbindet zwei Nomen: 私の本 = mein Buch, 日本の車 = ein japanisches Auto.'],
    pattern: /(私|僕|彼|彼女|日本|友達)の/,
  },
  {
    id: 'desu', title: 'です / だ – „sein“', ja: 'です',
    formula: 'X です (höflich) · X だ (locker)',
    text: [
      'です macht einen Satz höflich und entspricht oft „ist/bin/sind“. だ ist die lockere Form unter Freunden.',
      'Verneint: じゃないです / ではありません. Vergangenheit: でした.',
    ],
    pattern: /(です|でした)。$/,
  },
  {
    id: 'masu', title: 'ます-Form – höfliche Verben', ja: 'ます',
    formula: '食べる → 食べます · 行く → 行きます',
    text: [
      'Im Umgang mit Fremden (Laden, Hotel, Restaurant) nutzt du die ます-Form. Damit liegst du fast nie falsch.',
      'Verneint: ません. Vergangenheit: ました. Einladung: ましょう (lass uns …).',
    ],
    pattern: /ます。$/,
  },
  {
    id: 'mashita', title: 'Vergangenheit: ました / た', ja: '過去形',
    formula: '行きます → 行きました · 行く → 行った',
    text: ['Höflich hängst du ました an, locker wird aus dem Verb die た-Form (食べた, 行った, 見た).'],
    pattern: /(ました|った|んだ|いた|べた|見た)。$/,
  },
  {
    id: 'masen', title: 'Verneinung: ません / ない', ja: '否定',
    formula: 'わかります → わかりません · わかる → わからない',
    text: ['ません ist die höfliche Verneinung. Locker endet das Verb auf ない. Bei Adjektiven: 高い → 高くない.'],
    pattern: /(ません|ない)。$/,
  },
  {
    id: 'ka', title: 'Fragen mit か', ja: 'か',
    formula: 'Aussage + か = Frage',
    text: [
      'Aus jedem höflichen Satz wird mit か am Ende eine Frage – keine Umstellung nötig: 駅ですか。 – Ist das der Bahnhof?',
      'Mit Fragewörtern: 何 (was), どこ (wo), いつ (wann), いくら (wie viel kostet).',
    ],
    pattern: /(ですか|ますか|ませんか)[。？]$/,
  },
  {
    id: 'kudasai', title: 'Bitten: 〜てください', ja: 'ください',
    formula: 'て-Form + ください = Bitte …!',
    text: [
      'Mit Nomen: 水をください – Wasser, bitte. Mit Verben in der て-Form: 待ってください – Bitte warten Sie.',
      'Sehr nützlich: ゆっくり話してください – Bitte sprechen Sie langsam.',
    ],
    pattern: /ください/,
  },
  {
    id: 'tai', title: 'Wünsche: 〜たい', ja: 'たい',
    formula: '行きます → 行きたい(です)',
    text: ['Ersetze ます durch たい: 食べたい = ich möchte essen, 行きたい = ich möchte hin. Höflich mit です.'],
    pattern: /たい/,
  },
  {
    id: 'adj', title: 'い- und な-Adjektive', ja: '形容詞',
    formula: '高い店 · 綺麗な店',
    text: [
      'い-Adjektive (高い, おいしい) stehen direkt vor dem Nomen. な-Adjektive (綺麗, 好き, 大丈夫) brauchen vor einem Nomen ein な.',
      'Am Satzende: 高いです / 綺麗です.',
    ],
    pattern: /(な(人|店|所|こと|もの)|い(店|人|もの)です)/,
  },
]
