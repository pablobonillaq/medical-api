import type { Role } from '../users/users.schema.js'
import type { DoctorWithRelations } from './doctors.repository.js'

export const toDoctorResponse = ({ user, services, ...doctor }: DoctorWithRelations) => ({
  ...doctor,
  email: user.email,
  active: user.active,
  services: services.map(({ service }) => service),
})

export type DoctorResponse = ReturnType<typeof toDoctorResponse>

// The profile anyone can see: no account data (user id, email, status) and only the services
// the clinic still offers. The license number stays: in Mexico it is public, and patients
// can check it in the Registro Nacional de Profesionistas
export const toPublicDoctor = ({
  id,
  firstName,
  lastName,
  specialty,
  licenseNumber,
  services,
}: DoctorWithRelations) => ({
  id,
  firstName,
  lastName,
  specialty,
  licenseNumber,
  services: services
    .filter(({ service }) => service.active)
    .map(({ service }) => ({
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
    })),
})

export type PublicDoctor = ReturnType<typeof toPublicDoctor>

// The clinic's staff work with the whole record; visitors and patients get the public profile
const STAFF: readonly Role[] = ['admin', 'doctor', 'employee']

export const toDoctorView = (doctor: DoctorWithRelations, viewerRole: Role | undefined) =>
  viewerRole && STAFF.includes(viewerRole) ? toDoctorResponse(doctor) : toPublicDoctor(doctor)
