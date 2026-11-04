import { env } from '../../config/env.js'
import { getLocalDate, getLocalTime } from '../../shared/utils/timezone.js'
import type { AppointmentWithRelations } from './appointments.repository.js'

export const toAppointmentResponse = ({
  patient: { userId: _patientUserId, ...patient },
  doctor: { userId: _doctorUserId, ...doctor },
  ...appointment
}: AppointmentWithRelations) => ({
  ...appointment,
  // Local date and time of the clinic, ready to display
  date: getLocalDate(appointment.startsAt, env.CLINIC_TIMEZONE),
  time: getLocalTime(appointment.startsAt, env.CLINIC_TIMEZONE),
  patient,
  doctor,
})

export type AppointmentResponse = ReturnType<typeof toAppointmentResponse>
