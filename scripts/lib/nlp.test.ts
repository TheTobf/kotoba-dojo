import { beforeAll, describe, expect, it } from 'vitest'
import { alignFurigana, analyse, buildTokenizer, parseTranscription } from './nlp'

let tk: Awaited<ReturnType<typeof buildTokenizer>>
beforeAll(async () => { tk = await buildTokenizer() }, 30000)

describe('Furigana', () => {
  it('trennt Okurigana ab', () => {
    expect(alignFurigana('食べる', 'タベル')).toEqual([{ s: '食', r: 'た' }, { s: 'べる' }])
    expect(alignFurigana('取り消す', 'トリケス')).toEqual([{ s: '取', r: 'と' }, { s: 'り' }, { s: '消', r: 'け' }, { s: 'す' }])
  })
  it('liest Tatoeba-Umschrift', () => {
    expect(parseTranscription('[学生|がく|せい]です')).toEqual([{ s: '学', r: 'がく' }, { s: '生', r: 'せい' }, { s: 'です' }])
  })
})

describe('Satzanalyse', () => {
  it('liefert Romaji, Rollen, Satzteile und Zielwort', () => {
    const a = analyse(tk, '私は毎日コーヒーを飲みます。', (t) => t.basic_form === '飲む')
    expect(a.romaji).toBe('Watashi wa mainichi koohii o nomimasu.')
    expect(a.kana).toBe('わたしはまいにちコーヒーをのみます。')
    expect(a.chunks).toEqual(['私は', '毎日', 'コーヒーを', '飲みます。'])
    expect(a.tokens.find((t) => t.target)?.s).toBe('飲み')
    expect(a.tokens.find((t) => t.s === 'コーヒー')?.role).toBe('objekt')
    expect(a.tokens.find((t) => t.s === '私')?.role).toBe('subjekt')
  })
  it('hält Zahlen und kleines っ zusammen', () => {
    const a = analyse(tk, '全部で三千円です。', () => false, '[全部|ぜん|ぶ]で[三千円|さん|ぜん|えん]です。')
    expect(a.chunks).toEqual(['全部で', '三千円です。'])
    expect(a.romaji).toBe("Zenbu de sanzen'en desu.")
    expect(analyse(tk, '政府は法律を作った。', () => false).romaji).toBe('Seifu wa houritsu o tsukutta.')
  })
  it('bevorzugt die Tatoeba-Umschrift', () => {
    const a = analyse(tk, '今日は寒い。', () => false, '[今日|きょう]は[寒|さむ]い。')
    expect(a.furiganaSource).toBe('tatoeba')
    expect(a.tokens[0].f).toEqual([{ s: '今日', r: 'きょう' }])
  })
})
