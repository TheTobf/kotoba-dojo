import { describe, expect, it } from 'vitest'
import { klausurText, tageBis, wochenKey, wochenSpanne, wochenStart } from './woche'

describe('Kalenderwochen', () => {
  it('berechnet ISO-Wochen', () => {
    expect(wochenKey(new Date(2026, 10, 4))).toBe('2026-W45')
    expect(wochenKey(new Date(2026, 10, 2))).toBe('2026-W45') // Montag
    expect(wochenKey(new Date(2026, 10, 8))).toBe('2026-W45') // Sonntag
    expect(wochenKey(new Date(2026, 10, 9))).toBe('2026-W46')
    // Jahreswechsel: 2026 hat 53 Wochen, der 1.1.2027 gehört noch dazu
    expect(wochenKey(new Date(2027, 0, 1))).toBe('2026-W53')
    expect(wochenKey(new Date(2027, 0, 4))).toBe('2027-W01')
    expect(wochenKey(new Date(2024, 11, 30))).toBe('2025-W01')
  })

  it('findet den Montag', () => {
    const mo = wochenStart(new Date(2026, 10, 8, 22, 30))
    expect([mo.getFullYear(), mo.getMonth(), mo.getDate(), mo.getDay()]).toEqual([2026, 10, 2, 1])
  })

  it('beschriftet die Woche', () => {
    expect(wochenSpanne(new Date(2026, 10, 4))).toBe('2.–8. Nov.')
    expect(wochenSpanne(new Date(2026, 11, 2))).toBe('30. Nov. – 6. Dez.')
  })

  it('zählt Tage bis zur Klausur', () => {
    expect(tageBis(new Date(2026, 10, 4, 23, 0), '2026-11-05')).toBe(1)
    expect(tageBis(new Date(2026, 10, 4), '2026-11-04')).toBe(0)
    expect(tageBis(new Date(2026, 10, 4), '2027-02-10')).toBe(98)
    expect(klausurText(98)).toBe('Klausur in 14 Wochen')
    expect(klausurText(3)).toBe('Klausur in 3 Tagen')
    expect(klausurText(-1)).toBe('Klausur vorbei')
  })
})
