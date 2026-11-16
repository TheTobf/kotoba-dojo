/**
 * Die zwei Gratis-Probe-Missionen im Sprechmodus. Sie laufen komplett auf dem Gerät mit fest geschriebenen
 * Dialogen – ohne KI, ohne Konto, ohne Kosten.
 *
 * PLATZHALTER: Beispielinhalte, an die echte Story anpassen.
 */
import type { Mission } from '../../shared/mission'

export const TRIAL_MISSIONS: Mission[] = [
  {
    id: 'probe-cafe',
    title: 'Ein Kaffee, bitte',
    place: 'Café Komorebi',
    summary: 'Bestelle bei Haru einen Kaffee und frag nach dem Preis.',
    character: { name: 'Haru', role: 'Barista' },
    steps: [
      {
        says: { ja: 'いらっしゃいませ。ご注文は？', kana: 'いらっしゃいませ。ごちゅうもんは？', romaji: 'Irasshaimase. Gochūmon wa?', de: 'Willkommen. Was darf es sein?' },
        task: 'Bestelle einen Kaffee.',
        accepted: [
          { ja: 'コーヒーをください。', kana: 'コーヒーをください。', romaji: 'Kōhī o kudasai.', de: 'Einen Kaffee, bitte.' },
          { ja: 'コーヒーを一つください。', kana: 'コーヒーをひとつください。', romaji: 'Kōhī o hitotsu kudasai.', de: 'Einen Kaffee, bitte.' },
          { ja: 'コーヒーをお願いします。', kana: 'コーヒーをおねがいします。', romaji: 'Kōhī o onegai shimasu.', de: 'Einen Kaffee, bitte.' },
          { ja: 'コーヒーください。', kana: 'コーヒーください。', romaji: 'Kōhī kudasai.', de: 'Kaffee, bitte.' },
        ],
        hint: 'Muster zum Bestellen: ○○をください。 Kaffee heißt コーヒー (kōhī).',
      },
      {
        says: { ja: 'ホットとアイス、どちらにしますか。', kana: 'ホットとアイス、どちらにしますか。', romaji: 'Hotto to aisu, dochira ni shimasu ka.', de: 'Heiß oder kalt – was möchten Sie?' },
        task: 'Sag, dass du ihn heiß möchtest.',
        accepted: [
          { ja: 'ホットでお願いします。', kana: 'ホットでおねがいします。', romaji: 'Hotto de onegai shimasu.', de: 'Heiß, bitte.' },
          { ja: 'ホットをください。', kana: 'ホットをください。', romaji: 'Hotto o kudasai.', de: 'Einen heißen, bitte.' },
          { ja: 'ホットにします。', kana: 'ホットにします。', romaji: 'Hotto ni shimasu.', de: 'Ich nehme heiß.' },
          { ja: 'ホットです。', kana: 'ホットです。', romaji: 'Hotto desu.', de: 'Heiß.' },
        ],
        hint: 'Heiß = ホット (hotto). Höflich wählen: ○○でお願いします。',
      },
      {
        says: { ja: 'かしこまりました。', kana: 'かしこまりました。', romaji: 'Kashikomarimashita.', de: 'Sehr gern.' },
        task: 'Frag, wie viel es kostet.',
        accepted: [
          { ja: 'いくらですか。', kana: 'いくらですか。', romaji: 'Ikura desu ka.', de: 'Wie viel kostet das?' },
          { ja: 'おいくらですか。', kana: 'おいくらですか。', romaji: 'Oikura desu ka.', de: 'Wie viel kostet das?' },
        ],
        hint: '„Wie viel?“ heißt いくら (ikura). Mit ですか wird daraus eine höfliche Frage.',
      },
    ],
    ending: { ja: '四百五十円です。', kana: 'よんひゃくごじゅうえんです。', romaji: 'Yonhyaku gojū en desu.', de: 'Das macht 450 Yen.' },
  },
  {
    id: 'probe-weg',
    title: 'Wo ist der Bahnhof?',
    place: 'Straße in Shimokitazawa',
    summary: 'Du hast dich verlaufen. Sprich jemanden an und frag nach dem Weg zum Bahnhof.',
    character: { name: 'Passantin', role: 'unterwegs zum Einkaufen' },
    steps: [
      {
        says: { ja: '……', kana: '……', romaji: '…', de: '(Eine Frau geht an dir vorbei.)' },
        task: 'Sprich sie höflich an.',
        accepted: [
          { ja: 'すみません。', kana: 'すみません。', romaji: 'Sumimasen.', de: 'Entschuldigung.' },
          { ja: 'あのう、すみません。', kana: 'あのう、すみません。', romaji: 'Anō, sumimasen.', de: 'Ähm, Entschuldigung.' },
        ],
        hint: '„Entschuldigung“ zum Ansprechen heißt すみません (sumimasen).',
      },
      {
        says: { ja: 'はい、何でしょう。', kana: 'はい、なんでしょう。', romaji: 'Hai, nan deshō.', de: 'Ja, was gibt es?' },
        task: 'Frag, wo der Bahnhof ist.',
        accepted: [
          { ja: '駅はどこですか。', kana: 'えきはどこですか。', romaji: 'Eki wa doko desu ka.', de: 'Wo ist der Bahnhof?' },
          { ja: '駅はどこにありますか。', kana: 'えきはどこにありますか。', romaji: 'Eki wa doko ni arimasu ka.', de: 'Wo befindet sich der Bahnhof?' },
        ],
        hint: 'Bahnhof = 駅 (eki). Muster: ○○はどこですか。',
      },
      {
        says: { ja: 'まっすぐ行って、右です。', kana: 'まっすぐいって、みぎです。', romaji: 'Massugu itte, migi desu.', de: 'Geradeaus und dann rechts.' },
        task: 'Bedanke dich höflich.',
        accepted: [
          { ja: 'ありがとうございます。', kana: 'ありがとうございます。', romaji: 'Arigatō gozaimasu.', de: 'Vielen Dank.' },
          { ja: 'ありがとうございました。', kana: 'ありがとうございました。', romaji: 'Arigatō gozaimashita.', de: 'Vielen Dank.' },
          { ja: 'どうもありがとうございます。', kana: 'どうもありがとうございます。', romaji: 'Dōmo arigatō gozaimasu.', de: 'Vielen herzlichen Dank.' },
        ],
        hint: 'Höflich danken: ありがとうございます (arigatō gozaimasu).',
      },
    ],
    ending: { ja: 'いいえ、気をつけて。', kana: 'いいえ、きをつけて。', romaji: 'Iie, ki o tsukete.', de: 'Keine Ursache, passen Sie auf sich auf.' },
  },
]

export const findTrialMission = (id: string) => TRIAL_MISSIONS.find((m) => m.id === id)
