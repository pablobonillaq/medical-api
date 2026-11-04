import { describe, expect, it } from 'vitest'
import { minutesToTime, TIME_OF_DAY_REGEX, timeToMinutes } from './time.js'

describe('timeToMinutes', () => {
  it('converts HH:mm to minutes since midnight', () => {
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('09:30')).toBe(570)
    expect(timeToMinutes('23:59')).toBe(1439)
  })
})

describe('minutesToTime', () => {
  it('converts minutes since midnight to HH:mm with leading zeros', () => {
    expect(minutesToTime(0)).toBe('00:00')
    expect(minutesToTime(570)).toBe('09:30')
    expect(minutesToTime(1439)).toBe('23:59')
  })

  it('is the inverse of timeToMinutes', () => {
    for (const time of ['00:05', '07:45', '13:00', '23:55']) {
      expect(minutesToTime(timeToMinutes(time))).toBe(time)
    }
  })
})

describe('TIME_OF_DAY_REGEX', () => {
  it('accepts valid times with two digits', () => {
    for (const time of ['00:00', '09:05', '19:30', '23:59']) {
      expect(TIME_OF_DAY_REGEX.test(time)).toBe(true)
    }
  })

  it('rejects invalid times', () => {
    for (const time of ['9:00', '24:00', '12:60', '1200', 'ab:cd']) {
      expect(TIME_OF_DAY_REGEX.test(time)).toBe(false)
    }
  })
})
