// Format von episodes/epXX/episode.json und timing.json.

export type SegmentArt = 'erzaehler' | 'japanisch' | 'quiz' | 'pause';
export type Segment = {
  id: string;               // "s01" …
  art: SegmentArt;
  text?: string;            // erzaehler: deutscher Satz (das sprichst du) · japanisch: japanischer Satz
  regie?: string;           // z. B. "spannend", "kurze Pause"
  sprecher?: string;        // japanisch: Rolle aus stilvorlage.stimmen (knoe, personal, haru …)
  curriculum?: string;      // japanisch: Lehrplan-ID (c007) → Kana/Romaji/Deutsch kommen aus dem Lehrplan
  kana?: string; romaji?: string; de?: string; // japanisch ohne Lehrplan-Eintrag (z. B. Nebensatz der Figur)
  wiederholen?: boolean;    // japanisch: Satz zweimal abspielen (Auflösung)
  karte?: 'gross' | 'klein';// japanisch: Größe der Satzkarte (gross = Lernsatz)
  sek?: number;             // quiz/pause: Dauer
  frage?: string;           // quiz: eigener Fragetext
};

export type Kamera = {
  preset: 'totale' | 'halbnah' | 'nah' | 'gross' | 'ueberSchulter' | 'frosch' | 'vogel' | 'seite';
  fokus?: string;           // Figuren-ID oder "x,z"
  gegen?: string;           // ueberSchulter: Figur, auf die geschaut wird
  bewegung?: 'rein' | 'raus' | 'links' | 'rechts' | 'hoch' | 'runter';
};

export type FigurImShot = {
  id: string;               // eindeutig im Shot, z. B. "knoe", "beamtin"
  figur: 'knoe' | 'mensch' | 'kraehe';
  variante?: string;        // mensch: Variante aus VARIANTEN
  pos: [number, number];    // x, z
  nach?: [number, number];  // Laufziel (aktion gehen/rennen)
  blick?: number;           // Drehung in Grad (0 = zur Kamera)
  aktion?: string;          // Aktion aus animation.ts
  ausdruck?: string;
  extra?: Record<string, unknown>;
};

export type Shot = {
  ab: string;               // Segment-ID, mit der der Shot beginnt
  szene: 'flughafen' | 'bahnsteig' | 'konbini' | 'strasse' | 'hotel' | 'studio';
  kamera: Kamera;
  figuren: FigurImShot[];
  szeneProps?: Record<string, unknown>;
  effekt?: 'platsch' | 'wackeln' | 'blitz';
};

export type TextEinblendung = { ab: string; bis?: string; art: 'hook' | 'hinweis' | 'cliffhanger'; text: string; unter?: string };

export type Episode = {
  id: string; staffel: number; folge: number;
  art?: 'folge' | 'app';    // app = wöchentliches App-Video (Werbung, keine Lernsätze)
  titel: string; problem: string; cliffhanger: string;
  neu: string[]; wiederholung: string[];
  segmente: Segment[];
  shots: Shot[];
  texte: TextEinblendung[];
  naechste?: string;        // Teaser-Zeile am Ende
};

export type WortZeit = { w: string; start: number; ende: number; jp?: boolean };
export type SegmentTiming = { datei?: string; dauer: number; woerter?: WortZeit[]; phrasen?: WortZeit[]; wiederholungAb?: number };
export type Timing = { quelle: 'aufnahme' | 'elevenlabs' | 'vorschau'; elTier?: string; elStimme?: string; jpQuelle: 'voicevox' | 'vorschau'; segmente: Record<string, SegmentTiming>; sfx?: Record<string, string> };

export type CurriculumEintrag = { id: string; art: string; ja: string; kana: string; romaji: string; de: string; situation: string; niveau: number; thema: string; pruefen: string | null };
