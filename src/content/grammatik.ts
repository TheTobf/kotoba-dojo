/** Kurze Grammatik-Lektionen. Beispiele werden aus den Sätzen der App gesucht (`muster`). */
export interface Lektion {
  id: string
  titel: string
  jp: string
  text: string[]          // kurze Absätze
  formel?: string         // Merkformel
  muster: RegExp          // findet passende Beispielsätze
}

export const GRAMMATIK: Lektion[] = [
  {
    id: 'sov', titel: 'Satzstellung: das Verb kommt zum Schluss', jp: '語順',
    formel: 'Thema は – Objekt を – Verb',
    text: [
      'Deutsch: Ich trinke Kaffee. Japanisch: Ich – Kaffee – trinke. Das Verb (oder Adjektiv/です) steht fast immer ganz am Ende.',
      'Die Partikeln hinter den Wörtern zeigen ihre Rolle an. Deshalb ist die Reihenfolge davor recht frei – nur das Ende bleibt fest.',
    ],
    muster: /を.{1,6}(ます|る|た)。$/,
  },
  {
    id: 'wa', titel: 'は – das Thema des Satzes', jp: 'は',
    formel: 'X は Y です = Was X angeht: Y',
    text: [
      'は (gesprochen „wa“) markiert, worüber du redest. Oft entspricht es dem deutschen Subjekt, aber eigentlich heißt es „was … betrifft“.',
      'Typisch: 私は ドイツ人です。 – Ich bin Deutscher.',
    ],
    muster: /^[^。]{1,6}は.+です。$/,
  },
  {
    id: 'ga', titel: 'が – wer oder was (neu/betont)', jp: 'が',
    formel: 'X が 好き / ある / いる / わかる',
    text: [
      'が markiert das Subjekt, wenn es neu oder betont ist: „Wer? – ICH!“',
      'Feste Verbindungen: 〜が好き (mögen), 〜がある/いる (es gibt), 〜がわかる (verstehen).',
    ],
    muster: /が(好き|ある|あり|いる|い|わかる|わかり)/,
  },
  {
    id: 'wo', titel: 'を – das direkte Objekt', jp: 'を',
    formel: 'X を + Verb',
    text: ['を (gesprochen „o“) steht hinter dem, was „behandelt“ wird: Kaffee trinken, ein Buch lesen, einen Film sehen.'],
    muster: /を(飲|食|見|読|買|書|聞)/,
  },
  {
    id: 'ni', titel: 'に – Ziel, Zeitpunkt, Ort des Seins', jp: 'に',
    formel: 'Ort に 行く · 7時 に · Ort に いる',
    text: [
      'に zeigt ein Ziel (nach/zu), einen genauen Zeitpunkt (um 7 Uhr) oder wo sich etwas befindet (mit いる/ある).',
      'へ (gesprochen „e“) ist ähnlich wie „nach“ – betont mehr die Richtung.',
    ],
    muster: /に(行|来|帰|いる|い|ある|あり)/,
  },
  {
    id: 'de', titel: 'で – Ort der Handlung, Mittel', jp: 'で',
    formel: 'Ort で + Handlung · Bus で 行く',
    text: ['で = wo etwas passiert (im Restaurant essen) oder womit (mit dem Bus, auf Japanisch).'],
    muster: /(で(食|飲|働|勉強|買|会)|(バス|電車|日本語|英語)で)/,
  },
  {
    id: 'no', titel: 'の – Besitz und Verbindung', jp: 'の',
    formel: 'A の B = B von A / As B',
    text: ['の verbindet zwei Nomen: 私の本 = mein Buch, 日本の車 = ein japanisches Auto.'],
    muster: /(私|僕|彼|彼女|日本|友達)の/,
  },
  {
    id: 'desu', titel: 'です / だ – „sein“', jp: 'です',
    formel: 'X です (höflich) · X だ (locker)',
    text: [
      'です macht einen Satz höflich und entspricht oft „ist/bin/sind“. だ ist die lockere Form unter Freunden.',
      'Verneint: じゃないです / ではありません. Vergangenheit: でした.',
    ],
    muster: /(です|でした)。$/,
  },
  {
    id: 'masu', titel: 'ます-Form – höfliche Verben', jp: 'ます',
    formel: '食べる → 食べます · 行く → 行きます',
    text: [
      'Im Umgang mit Fremden (Laden, Hotel, Restaurant) nutzt du die ます-Form. Das ist die sicherste Form für deine Reise.',
      'Verneint: ません. Vergangenheit: ました. Einladung: ましょう (lass uns …).',
    ],
    muster: /ます。$/,
  },
  {
    id: 'mashita', titel: 'Vergangenheit: ました / た', jp: '過去形',
    formel: '行きます → 行きました · 行く → 行った',
    text: ['Höflich hängst du ました an, locker wird aus dem Verb die た-Form (食べた, 行った, 見た).'],
    muster: /(ました|った|んだ|いた|べた|見た)。$/,
  },
  {
    id: 'masen', titel: 'Verneinung: ません / ない', jp: '否定',
    formel: 'わかります → わかりません · わかる → わからない',
    text: ['ません ist die höfliche Verneinung. Locker endet das Verb auf ない. Bei Adjektiven: 高い → 高くない.'],
    muster: /(ません|ない)。$/,
  },
  {
    id: 'ka', titel: 'Fragen mit か', jp: 'か',
    formel: 'Aussage + か = Frage',
    text: [
      'Aus jedem höflichen Satz wird mit か am Ende eine Frage – keine Umstellung nötig: 駅ですか。 – Ist das der Bahnhof?',
      'Mit Fragewörtern: 何 (was), どこ (wo), いつ (wann), いくら (wie viel kostet).',
    ],
    muster: /(ですか|ますか|ませんか)[。？]$/,
  },
  {
    id: 'kudasai', titel: 'Bitten: 〜てください', jp: 'ください',
    formel: 'て-Form + ください = Bitte …!',
    text: [
      'Mit Nomen: 水をください – Wasser, bitte. Mit Verben in der て-Form: 待ってください – Bitte warten Sie.',
      'Sehr nützlich auf der Reise: ゆっくり話してください – Bitte sprechen Sie langsam.',
    ],
    muster: /ください/,
  },
  {
    id: 'tai', titel: 'Wünsche: 〜たい', jp: 'たい',
    formel: '行きます → 行きたい(です)',
    text: ['Ersetze ます durch たい: 食べたい = ich möchte essen, 行きたい = ich möchte hin. Höflich mit です.'],
    muster: /たい/,
  },
  {
    id: 'adj', titel: 'い- und な-Adjektive', jp: '形容詞',
    formel: '高い店 · 綺麗な店',
    text: [
      'い-Adjektive (高い, おいしい) stehen direkt vor dem Nomen. な-Adjektive (綺麗, 好き, 大丈夫) brauchen vor einem Nomen ein な.',
      'Am Satzende: 高いです / 綺麗です.',
    ],
    muster: /(な(人|店|所|こと|もの)|い(店|人|もの)です)/,
  },
]
