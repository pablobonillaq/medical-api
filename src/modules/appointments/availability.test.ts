import { describe, expect, it } from 'vitest'
import { getLocalTime, localDateTimeToUtc } from '../../shared/utils/timezone.js'
import { computeSlots, overlaps, type TimeRange } from './availability.js'

const TIME_ZONE = 'America/Mexico_City'
const DATE = '2026-11-09'

// Local time of the test day as a UTC instant: at(9, 30) → 09:30 in Mexico City
const at = (hours: number, minutes = 0) => localDateTimeToUtc(DATE, hours * 60 + minutes, TIME_ZONE)

const range = (start: Date, end: Date): TimeRange => ({ start, end })

// Slots as "HH:mm-HH:mm" in clinic time, easier to read in assertions
const format = (slots: TimeRange[]) =>
  slots.map(({ start, end }) => `${getLocalTime(start, TIME_ZONE)}-${getLocalTime(end, TIME_ZONE)}`)

const baseInput = {
  date: DATE,
  durationMinutes: 30,
  stepMinutes: 15,
  busy: [],
  now: new Date('2026-11-01T00:00:00.000Z'),
  timeZone: TIME_ZONE,
}

describe('overlaps', () => {
  it('detects ranges that share time', () => {
    expect(overlaps(range(at(9), at(10)), range(at(9, 30), at(10, 30)))).toBe(true)
    expect(overlaps(range(at(9), at(12)), range(at(10), at(11)))).toBe(true)
  })

  it('does not treat back-to-back ranges as overlapping', () => {
    expect(overlaps(range(at(9), at(10)), range(at(10), at(11)))).toBe(false)
  })
})

describe('computeSlots', () => {
  it('generates a slot every 15 minutes while the whole service fits in the block', () => {
    const slots = computeSlots({ ...baseInput, blocks: [{ startMinute: 540, endMinute: 660 }] })

    expect(format(slots)).toEqual([
      '09:00-09:30',
      '09:15-09:45',
      '09:30-10:00',
      '09:45-10:15',
      '10:00-10:30',
      '10:15-10:45',
      '10:30-11:00',
    ])
  })

  it('returns no slots when the service is longer than the block', () => {
    const slots = computeSlots({ ...baseInput, blocks: [{ startMinute: 540, endMinute: 560 }] })
    expect(slots).toHaveLength(0)
  })

  it('combines several blocks of the same day', () => {
    const slots = computeSlots({
      ...baseInput,
      durationMinutes: 60,
      blocks: [
        { startMinute: 540, endMinute: 600 },
        { startMinute: 960, endMinute: 1020 },
      ],
    })
    expect(format(slots)).toEqual(['09:00-10:00', '16:00-17:00'])
  })

  it('skips slots that overlap a busy range (appointment or time off)', () => {
    const slots = computeSlots({
      ...baseInput,
      blocks: [{ startMinute: 540, endMinute: 660 }],
      busy: [range(at(9, 30), at(10))],
    })

    expect(format(slots)).toEqual(['09:00-09:30', '10:00-10:30', '10:15-10:45', '10:30-11:00'])
  })

  it('returns no slots when time off covers the whole day', () => {
    const slots = computeSlots({
      ...baseInput,
      blocks: [{ startMinute: 540, endMinute: 840 }],
      busy: [range(at(0), at(24))],
    })
    expect(slots).toHaveLength(0)
  })

  it('only offers slots that start after now', () => {
    const slots = computeSlots({
      ...baseInput,
      blocks: [{ startMinute: 540, endMinute: 660 }],
      now: at(10),
    })
    expect(format(slots)).toEqual(['10:15-10:45', '10:30-11:00'])
  })
})
