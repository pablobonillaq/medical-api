import { localDateTimeToUtc } from '../../shared/utils/timezone.js'

export interface TimeRange {
  start: Date
  end: Date
}

// Two ranges overlap when each one starts before the other ends.
// Back-to-back ranges (one ends at 10:00, the next starts at 10:00) do not overlap.
export const overlaps = (a: TimeRange, b: TimeRange) => a.start < b.end && b.start < a.end

interface ComputeSlotsInput {
  date: string
  blocks: { startMinute: number; endMinute: number }[]
  durationMinutes: number
  stepMinutes: number
  busy: TimeRange[]
  now: Date
  timeZone: string
}

// Pure function: no database access, so it is easy to test.
// For each schedule block, it tries a start time every `stepMinutes` and keeps the ones that
// fit completely inside the block, are in the future and do not overlap any busy range.
export const computeSlots = ({
  date,
  blocks,
  durationMinutes,
  stepMinutes,
  busy,
  now,
  timeZone,
}: ComputeSlotsInput): TimeRange[] => {
  const slots: TimeRange[] = []

  for (const block of blocks) {
    for (
      let minute = block.startMinute;
      minute + durationMinutes <= block.endMinute;
      minute += stepMinutes
    ) {
      const start = localDateTimeToUtc(date, minute, timeZone)
      const slot = { start, end: new Date(start.getTime() + durationMinutes * 60_000) }

      if (slot.start <= now) continue
      if (busy.some((range) => overlaps(slot, range))) continue
      slots.push(slot)
    }
  }

  return slots
}
