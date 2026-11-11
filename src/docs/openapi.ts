import { createDocument, type ZodOpenApiPathsObject } from 'zod-openapi'
import { ACCESS_TOKEN_COOKIE } from '../modules/auth/auth.constants.js'
import { authPaths } from '../modules/auth/auth.docs.js'
import { doctorsPaths } from '../modules/doctors/doctors.docs.js'
import { healthPaths } from '../modules/health/health.docs.js'
import { schedulesPaths } from '../modules/schedules/schedules.docs.js'
import { servicesPaths } from '../modules/services/services.docs.js'
import { usersPaths } from '../modules/users/users.docs.js'
import { appointmentsPaths } from '../modules/appointments/appointments.docs.js'
import { availabilityPaths } from '../modules/appointments/availability.docs.js'
import { attachmentsPaths } from '../modules/attachments/attachments.docs.js'
import { auditPaths } from '../modules/audit/audit.docs.js'
import { chatPaths } from '../modules/chat/chat.docs.js'
import { medicalRecordsPaths } from '../modules/medical-records/medical-records.docs.js'
import { patientsPaths } from '../modules/patients/patients.docs.js'

const paths: ZodOpenApiPathsObject = {
  ...healthPaths,
  ...authPaths,
  ...usersPaths,
  ...servicesPaths,
  ...doctorsPaths,
  ...schedulesPaths,
  ...patientsPaths,
  ...availabilityPaths,
  ...appointmentsPaths,
  ...medicalRecordsPaths,
  ...attachmentsPaths,
  ...auditPaths,
  ...chatPaths,
}

const description = `
REST API for a clinic with several doctors: appointments, medical records, files,
chat with the front desk and appointment reminders.

**How to try it from this page:** run \`POST /auth/login\` with "Try it out".
The session is saved in an httpOnly cookie (\`${ACCESS_TOKEN_COOKIE}\`, 1 hour) and the
browser sends it with every other request made from this page.

The request bodies and parameters shown here come from the same Zod schemas that
validate the requests, so they never fall behind the code.

Every client can make up to 300 requests per minute (429 after that; \`/health\` is not counted).
`

// Built from the Zod schemas: the same rules that validate each request
export const buildOpenApiDocument = () =>
  createDocument({
    openapi: '3.1.0',
    info: { title: 'Medical API', version: '1.0.0', description },
    tags: [
      { name: 'Health' },
      { name: 'Auth', description: 'Patient sign-up and session' },
      { name: 'Users', description: 'Staff accounts (admins only)' },
      { name: 'Services', description: 'What the clinic offers' },
      { name: 'Doctors', description: 'Doctor profiles and the services they offer' },
      { name: 'Schedules', description: 'Weekly hours and time off of each doctor' },
      { name: 'Patients', description: 'Patient profiles' },
      { name: 'Availability', description: 'Free times to book' },
      { name: 'Appointments', description: 'Booking, changes and attendance' },
      {
        name: 'Medical records',
        description: 'Medical history and clinical notes. Every access is audited.',
      },
      { name: 'Attachments', description: 'Files of the medical record' },
      { name: 'Audit log', description: 'Who accessed each medical record' },
      {
        name: 'Chat',
        description:
          'Patients and front desk. Real-time events use Socket.IO on the same server (see the README).',
      },
    ],
    // Every operation needs the session cookie unless it says otherwise
    security: [{ sessionCookie: [] }],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: ACCESS_TOKEN_COOKIE,
          description: 'Set by POST /auth/login. The browser sends it automatically.',
        },
      },
    },
    paths,
  })
