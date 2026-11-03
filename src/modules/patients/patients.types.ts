import type { PatientWithUser } from './patients.repository.js'

export const toPatientResponse = ({ user, birthDate, ...patient }: PatientWithUser) => ({
  ...patient,
  birthDate: birthDate.toISOString().slice(0, 10),
  email: user?.email ?? null,
  hasAccount: user !== null,
})

export type PatientResponse = ReturnType<typeof toPatientResponse>
