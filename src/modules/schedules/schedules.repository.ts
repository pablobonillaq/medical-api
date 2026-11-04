import { prisma } from '../../db/prisma.js'

interface BlockData {
  dayOfWeek: number
  startMinute: number
  endMinute: number
}

export const schedulesRepository = {
  findDoctor: (id: string) =>
    prisma.doctor.findUnique({ where: { id }, select: { id: true, userId: true } }),

  findBlocks: (doctorId: string) =>
    prisma.scheduleBlock.findMany({
      where: { doctorId },
      orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
    }),

  findBlocksForDay: (doctorId: string, dayOfWeek: number) =>
    prisma.scheduleBlock.findMany({
      where: { doctorId, dayOfWeek },
      orderBy: { startMinute: 'asc' },
    }),

  // Replaces the whole weekly schedule: both operations succeed or neither does
  replaceBlocks: (doctorId: string, blocks: BlockData[]) =>
    prisma.$transaction([
      prisma.scheduleBlock.deleteMany({ where: { doctorId } }),
      prisma.scheduleBlock.createMany({ data: blocks.map((block) => ({ doctorId, ...block })) }),
    ]),

  findUpcomingTimeOff: (doctorId: string, now: Date) =>
    prisma.timeOff.findMany({
      where: { doctorId, endsAt: { gt: now } },
      orderBy: { startsAt: 'asc' },
    }),

  // Two ranges overlap when each one starts before the other ends
  findOverlappingTimeOff: (doctorId: string, startsAt: Date, endsAt: Date) =>
    prisma.timeOff.findFirst({
      where: { doctorId, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
    }),

  findTimeOffBetween: (doctorId: string, from: Date, to: Date) =>
    prisma.timeOff.findMany({
      where: { doctorId, startsAt: { lt: to }, endsAt: { gt: from } },
    }),

  createTimeOff: (data: {
    doctorId: string
    startsAt: Date
    endsAt: Date
    reason: string | null
  }) => prisma.timeOff.create({ data }),

  findTimeOff: (id: string, doctorId: string) =>
    prisma.timeOff.findFirst({ where: { id, doctorId } }),

  deleteTimeOff: (id: string) => prisma.timeOff.delete({ where: { id } }),
}
