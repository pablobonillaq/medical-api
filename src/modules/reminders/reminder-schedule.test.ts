import { describe, expect, it } from 'vitest'
import { reminderTimeFor, retryTimeFor } from './reminder-schedule.js'

const NOW = new Date('2026-11-09T12:00:00.000Z')
const hoursFromNow = (hours: number) => new Date(NOW.getTime() + hours * 60 * 60 * 1000)
const minutesFromNow = (minutes: number) => new Date(NOW.getTime() + minutes * 60 * 1000)

describe('reminderTimeFor', () => {
  it('schedules the reminder 24 hours before the appointment', () => {
    expect(reminderTimeFor(hoursFromNow(72), NOW)).toEqual(hoursFromNow(48))
  })

  it('sends it right away when the appointment is less than 24 hours away', () => {
    expect(reminderTimeFor(hoursFromNow(5), NOW)).toEqual(NOW)
  })

  it('does not schedule a reminder for an appointment less than 2 hours away', () => {
    expect(reminderTimeFor(hoursFromNow(1.5), NOW)).toBeNull()
    expect(reminderTimeFor(hoursFromNow(-1), NOW)).toBeNull()
  })
})

describe('retryTimeFor', () => {
  it('waits longer after each failed attempt', () => {
    expect(retryTimeFor(1, NOW)).toEqual(minutesFromNow(1))
    expect(retryTimeFor(2, NOW)).toEqual(minutesFromNow(5))
    expect(retryTimeFor(3, NOW)).toEqual(minutesFromNow(15))
    expect(retryTimeFor(4, NOW)).toEqual(minutesFromNow(60))
  })

  it('never waits more than the longest delay', () => {
    expect(retryTimeFor(10, NOW)).toEqual(minutesFromNow(60))
  })
})
