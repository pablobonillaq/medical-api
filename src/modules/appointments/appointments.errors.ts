import { Prisma } from '../../generated/prisma/client.js'

// PostgreSQL rejects an overlapping appointment with error 23P01 (exclusion_violation).
// Prisma wraps it in a PrismaClientKnownRequestError whose message includes the constraint name.
export const isDoubleBookingError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.message.includes('appointments_no_overlap')
