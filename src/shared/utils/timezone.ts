// Helpers to convert between the clinic's local time and UTC instants.
// Schedules are stored as local "wall clock" times; appointments as UTC instants.

const MS_PER_MINUTE = 60_000

const partsFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

const getLocalParts = (instant: Date, timeZone: string) => {
  const parts = new Map(
    partsFormatter(timeZone)
      .formatToParts(instant)
      .map(({ type, value }) => [type, value]),
  )
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.get(type))
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

// Difference between local time and UTC, in minutes (Mexico City: -360)
const getOffsetMinutes = (instant: Date, timeZone: string) => {
  const { year, month, day, hour, minute, second } = getLocalParts(instant, timeZone)
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  return Math.round((localAsUtc - instant.getTime()) / MS_PER_MINUTE)
}

const parseDate = (date: string) => {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  return { year, month, day }
}

// "2026-11-09" + 540 minutes (09:00) in America/Mexico_City → 2026-11-09T15:00:00.000Z
export const localDateTimeToUtc = (date: string, minutes: number, timeZone: string): Date => {
  const { year, month, day } = parseDate(date)
  const wallClockAsUtc = Date.UTC(year, month - 1, day, 0, minutes)
  const offset = getOffsetMinutes(new Date(wallClockAsUtc), timeZone)
  const result = new Date(wallClockAsUtc - offset * MS_PER_MINUTE)
  // A second pass corrects the result on days when the offset changes (daylight saving time)
  const correctedOffset = getOffsetMinutes(result, timeZone)
  return correctedOffset === offset
    ? result
    : new Date(wallClockAsUtc - correctedOffset * MS_PER_MINUTE)
}

// Today's date in the clinic, as YYYY-MM-DD
export const getLocalDate = (instant: Date, timeZone: string): string => {
  const { year, month, day } = getLocalParts(instant, timeZone)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Local time of an instant, as HH:mm
export const getLocalTime = (instant: Date, timeZone: string): string => {
  const { hour, minute } = getLocalParts(instant, timeZone)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// ISO day of the week of a date: 1 = Monday … 7 = Sunday
export const getIsoDayOfWeek = (date: string): number => {
  const { year, month, day } = parseDate(date)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return weekday === 0 ? 7 : weekday
}

// Number of whole days between two YYYY-MM-DD dates
export const daysBetween = (from: string, to: string): number => {
  const a = parseDate(from)
  const b = parseDate(to)
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000,
  )
}
