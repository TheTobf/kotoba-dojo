// Baut aus episode.json + timing.json die Zeitleiste (in Frames). Szenen, Untertitel und Kamera richten sich danach.
import { Episode, Segment, SegmentTiming, Shot, Timing } from './typen';

export type Vorlage = { schnitt: { pauseZwischenSaetzenSek: number; pauseVorJapanischSek: number; pauseNachJapanischSek: number; quizCountdownSek: number; schnittMaxSek: number; endeTeaserSek: number }; format: { fps: number } };
export type SegZeit = { seg: Segment; von: number; bis: number; audioVon: number; t?: SegmentTiming };
export type ShotZeit = { shot: Shot; von: number; bis: number; teil: number; teile: number };

export function zeitleiste(ep: Episode, timing: Timing, v: Vorlage) {
  const fps = v.format.fps, s = v.schnitt;
  const f = (sek: number) => Math.round(sek * fps);
  let t = 0;
  const segs: SegZeit[] = [];
  ep.segmente.forEach((seg, i) => {
    const prev = ep.segmente[i - 1];
    if (prev) t += f(seg.art === 'japanisch' || prev.art === 'japanisch' ? (seg.art === 'japanisch' ? s.pauseVorJapanischSek : s.pauseNachJapanischSek) : s.pauseZwischenSaetzenSek);
    const ti = timing.segmente[seg.id];
    let dauer: number;
    if (seg.art === 'quiz') dauer = seg.sek ?? s.quizCountdownSek;
    else if (seg.art === 'pause') dauer = seg.sek ?? 0.6;
    else if (!ti) throw new Error(`timing.json: Segment ${seg.id} fehlt`);
    else dauer = ti.dauer;
    const von = t;
    t += f(dauer);
    segs.push({ seg, von, bis: t, audioVon: von, t: ti });
  });
  const teaser = f(s.endeTeaserSek);
  const gesamt = t + teaser;
  // Shots: von Segment-Start bis zum nächsten Shot; lange Shots werden in Teile (≤ schnittMaxSek) geteilt → Perspektivwechsel
  const start = (id: string) => { const z = segs.find((x) => x.seg.id === id); if (!z) throw new Error(`Shot ab „${id}“: Segment fehlt`); return z.von; };
  const sortiert = [...ep.shots].sort((a, b) => start(a.ab) - start(b.ab));
  const shots: ShotZeit[] = [];
  sortiert.forEach((shot, i) => {
    const von = i === 0 ? 0 : start(shot.ab);
    const bis = i + 1 < sortiert.length ? start(sortiert[i + 1].ab) : gesamt;
    const teile = Math.max(1, Math.ceil((bis - von) / f(s.schnittMaxSek)));
    const len = (bis - von) / teile;
    for (let k = 0; k < teile; k++) shots.push({ shot, von: Math.round(von + k * len), bis: Math.round(von + (k + 1) * len), teil: k, teile });
  });
  return { segs, shots, gesamt, teaserVon: t, fps };
}
