import type { DoctorWithRelations } from './doctors.repository.js'

export const toDoctorResponse = ({ user, services, ...doctor }: DoctorWithRelations) => ({
  ...doctor,
  email: user.email,
  active: user.active,
  services: services.map(({ service }) => service),
})

export type DoctorResponse = ReturnType<typeof toDoctorResponse>
