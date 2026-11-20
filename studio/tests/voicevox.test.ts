import { describe, expect, it } from 'vitest'
import { expectedPron, moraTimes, normalizePron, pronHiragana, type AudioQuery } from '../scripts/lib/voicevox'

describe('Lesungs-Prüfung', () => {
  it('Umschrift → Aussprache', () => {
    expect(expectedPron('Arigatō gozaimasu.')).toBe(normalizePron('アリガトーゴザイマス'))
    expect(expectedPron('Toire wa doko desu ka.')).toBe('トイレワドコデスカ')
    expect(expectedPron('Kore o kudasai.')).toBe(normalizePron('コレヲクダサイ'))
    expect(expectedPron('Yachin wa tsuki hachiman-en desu.')).toBe('ヤチンワツキハチマンエンデス')
    expect(expectedPron('Shōshō o-machi kudasai.')).toBe(normalizePron('ショーショーオマチクダサイ'))
  })
  it('lange Vokale gelten gleich (ー, ウ, オ)', () => {
    expect(normalizePron('トーキョー')).toBe(normalizePron('トウキョウ'))
    expect(normalizePron("ト'オキョオ/エ_キ")).toBe(normalizePron('トーキョーエキ'))
    expect(normalizePron('ドーユー')).toBe(expectedPron('dō iu'))
  })
  it('Hiragana aus der Umschrift (は→わ)', () => {
    expect(pronHiragana('Honjitsu wa manseki desu.')).toBe('ほんじつわまんせきです。')
    expect(pronHiragana('Tōkyō-eki ni ikimasu ka?')).toBe('とうきょうえきにいきますか？')
  })
  it('Mora-Zeiten aus der VOICEVOX-Abfrage', () => {
    const q = {
      accent_phrases: [{ moras: [{ text: 'ス', consonant_length: 0.05, vowel_length: 0.1 }, { text: 'ミ', consonant_length: 0.04, vowel_length: 0.1 }], pause_mora: null }],
      speedScale: 0.5, prePhonemeLength: 0.1, postPhonemeLength: 0.1, outputSamplingRate: 48000, outputStereo: false,
    } as AudioQuery
    const m = moraTimes(q)
    expect(m[0]).toEqual({ kana: 'ス', start: 0.2, end: 0.5 })
    expect(m[1].end).toBeCloseTo(0.78, 5)
  })
})
