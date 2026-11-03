// Times of day are stored as minutes since midnight (09:30 → 570)

export const TIME_OF_DAY_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export const timeToMinutes = (time: string): number => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export const minutesToTime = (totalMinutes: number): string => {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const minutes = String(totalMinutes % 60).padStart(2, '0')
  return `${hours}:${minutes}`
}
