/**
 * Pro-Story-Missionen. Sie liegen bewusst auf dem SERVER und nicht im App-Paket:
 * Der vollständige Inhalt wird nur an Konten mit Pro ausgeliefert (worker/routes/story.ts).
 *
 * PLATZHALTER: Beispiel-Missionen, bis die echten Story-Folgen vorliegen.
 */
import type { Mission } from '../../shared/mission'

export const PRO_MISSIONS: Mission[] = [
  {
    id: 'ryokan-checkin',
    title: 'Ankunft im Ryokan',
    place: 'Hakone, traditionelles Gasthaus',
    summary: 'Du kommst abends im Ryokan an. Melde dich an, frag nach dem Bad und nach dem Frühstück.',
    character: { name: 'Frau Mori', role: 'Wirtin' },
    steps: [
      {
        says: { ja: 'いらっしゃいませ。ご予約のお名前は？', kana: 'いらっしゃいませ。ごよやくのおなまえは？', romaji: 'Irasshaimase. Goyoyaku no onamae wa?', de: 'Herzlich willkommen. Auf welchen Namen haben Sie reserviert?' },
        task: 'Sag, dass du eine Reservierung hast.',
        accepted: [
          { ja: '予約があります。', kana: 'よやくがあります。', romaji: 'Yoyaku ga arimasu.', de: 'Ich habe eine Reservierung.' },
          { ja: '予約しています。', kana: 'よやくしています。', romaji: 'Yoyaku shite imasu.', de: 'Ich habe reserviert.' },
        ],
        hint: '„Reservierung“ heißt 予約 (yoyaku). „Es gibt / ich habe“ ist があります.',
      },
      {
        says: { ja: 'ありがとうございます。お部屋は二階です。', kana: 'ありがとうございます。おへやはにかいです。', romaji: 'Arigatō gozaimasu. Oheya wa nikai desu.', de: 'Vielen Dank. Ihr Zimmer ist im ersten Stock.' },
        task: 'Frag, wo das Bad ist.',
        accepted: [
          { ja: 'お風呂はどこですか。', kana: 'おふろはどこですか。', romaji: 'Ofuro wa doko desu ka.', de: 'Wo ist das Bad?' },
          { ja: '温泉はどこですか。', kana: 'おんせんはどこですか。', romaji: 'Onsen wa doko desu ka.', de: 'Wo ist die heiße Quelle?' },
        ],
        hint: 'Muster: ○○はどこですか。 Das Bad heißt お風呂 (ofuro).',
      },
      {
        says: { ja: 'お風呂は一階の奥です。', kana: 'おふろはいっかいのおくです。', romaji: 'Ofuro wa ikkai no oku desu.', de: 'Das Bad ist im Erdgeschoss ganz hinten.' },
        task: 'Frag, um wie viel Uhr es Frühstück gibt.',
        accepted: [
          { ja: '朝ごはんは何時ですか。', kana: 'あさごはんはなんじですか。', romaji: 'Asagohan wa nanji desu ka.', de: 'Um wie viel Uhr ist das Frühstück?' },
          { ja: '朝食は何時ですか。', kana: 'ちょうしょくはなんじですか。', romaji: 'Chōshoku wa nanji desu ka.', de: 'Um wie viel Uhr ist das Frühstück?' },
        ],
        hint: 'Frühstück = 朝ごはん (asagohan), „wie viel Uhr“ = 何時 (nanji).',
      },
    ],
    ending: { ja: '七時からです。ごゆっくりどうぞ。', kana: 'しちじからです。ごゆっくりどうぞ。', romaji: 'Shichiji kara desu. Goyukkuri dōzo.', de: 'Ab sieben Uhr. Lassen Sie es sich gut gehen.' },
  },
  {
    id: 'verlorener-schirm',
    title: 'Der verlorene Schirm',
    place: 'Bahnhof Shinjuku, Fundbüro',
    summary: 'Du hast deinen Schirm im Zug vergessen. Erkläre im Fundbüro, was passiert ist.',
    character: { name: 'Herr Tanaka', role: 'Bahnangestellter' },
    steps: [
      {
        says: { ja: 'こんにちは。どうしましたか。', kana: 'こんにちは。どうしましたか。', romaji: 'Konnichiwa. Dō shimashita ka.', de: 'Guten Tag. Was ist passiert?' },
        task: 'Sag, dass du deinen Schirm vergessen hast.',
        accepted: [
          { ja: '傘を忘れました。', kana: 'かさをわすれました。', romaji: 'Kasa o wasuremashita.', de: 'Ich habe meinen Schirm vergessen.' },
          { ja: '傘をなくしました。', kana: 'かさをなくしました。', romaji: 'Kasa o nakushimashita.', de: 'Ich habe meinen Schirm verloren.' },
        ],
        hint: 'Schirm = 傘 (kasa), vergessen = 忘れました (wasuremashita).',
      },
      {
        says: { ja: 'どんな傘ですか。', kana: 'どんなかさですか。', romaji: 'Donna kasa desu ka.', de: 'Was für ein Schirm ist es?' },
        task: 'Sag, dass es ein schwarzer Schirm ist.',
        accepted: [
          { ja: '黒い傘です。', kana: 'くろいかさです。', romaji: 'Kuroi kasa desu.', de: 'Es ist ein schwarzer Schirm.' },
          { ja: '黒いです。', kana: 'くろいです。', romaji: 'Kuroi desu.', de: 'Er ist schwarz.' },
        ],
        hint: 'schwarz = 黒い (kuroi). Das Adjektiv steht direkt vor dem Nomen.',
      },
    ],
    ending: { ja: 'ありました！これですね。', kana: 'ありました！これですね。', romaji: 'Arimashita! Kore desu ne.', de: 'Da ist er! Das ist er, oder?' },
  },
]

export const findProMission = (id: string) => PRO_MISSIONS.find((m) => m.id === id)
