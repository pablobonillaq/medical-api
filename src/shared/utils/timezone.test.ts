import { describe, expect, it } from 'vitest'
import {
  daysBetween,
  getIsoDayOfWeek,
  getLocalDate,
  getLocalTime,
  localDateTimeToUtc,
} from './timezone.js'

const MEXICO_CITY = 'America/Mexico_City'

describe('localDateTimeToUtc', () => {
  it('converts clinic local time to UTC (Mexico City is UTC-6)', () => {
    expect(localDateTimeToUtc('2026-11-09', 9 * 60, MEXICO_CITY).toISOString()).toBe(
      '2026-11-09T15:00:00.000Z',
    )
  })

  it('handles the end of the day (24:00 is midnight of the next day)', () => {
    expect(localDateTimeToUtc('2026-11-09', 24 * 60, MEXICO_CITY).toISOString()).toBe(
      '2026-11-10T06:00:00.000Z',
    )
  })

  it('uses the right offset before and after a daylight saving change', () => {
    // New York moves from UTC-5 to UTC-4 on 2027-03-14 at 02:00
    expect(localDateTimeToUtc('2027-03-14', 90, 'America/New_York').toISOString()).toBe(
      '2027-03-14T06:30:00.000Z',
    )
    expect(localDateTimeToUtc('2027-03-14', 210, 'America/New_York').toISOString()).toBe(
      '2027-03-14T07:30:00.000Z',
    )
  })
})

describe('getLocalDate and getLocalTime', () => {
  it('returns the date and time in the clinic, not in UTC', () => {
    // 03:00 UTC on the 5th is still 21:00 of the 4th in Mexico City
    const instant = new Date('2026-11-05T03:00:00.000Z')
    expect(getLocalDate(instant, MEXICO_CITY)).toBe('2026-11-04')
    expect(getLocalTime(instant, MEXICO_CITY)).toBe('21:00')
  })
})

describe('getIsoDayOfWeek', () => {
  it('returns 1 for Monday and 7 for Sunday', () => {
    expect(getIsoDayOfWeek('2026-11-09')).toBe(1)
    expect(getIsoDayOfWeek('2026-11-08')).toBe(7)
  })
})

describe('daysBetween', () => {
  it('counts whole days between two dates, negative when going back', () => {
    expect(daysBetween('2026-11-04', '2026-11-04')).toBe(0)
    expect(daysBetween('2026-11-04', '2026-12-31')).toBe(57)
    expect(daysBetween('2026-11-04', '2026-11-03')).toBe(-1)
  })
})
