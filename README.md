**English** | [Español](README.es.md)

# Medical API

[![CI](https://github.com/pablobonillaq/medical-api/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/pablobonillaq/medical-api/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=pablobonillaq_medical-api&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=pablobonillaq_medical-api)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=pablobonillaq_medical-api&metric=coverage)](https://sonarcloud.io/summary/new_code?id=pablobonillaq_medical-api)

REST API for managing a multi-doctor clinic: appointment scheduling, electronic medical records, patient–clinic chat, and appointment reminders via WhatsApp.

> **Status:** in development. Phases 1–7 completed (base setup, database, authentication and roles, catalogs, appointments, tests and CI, medical records and audit log); next: real-time chat.
> Portfolio project. All test data is **fictitious**.

## Features

- [x] JWT authentication with cookies and role-based access control
- [x] Management of doctors, services, schedules and days off
- [x] Patient profiles: self-registration or front-desk registration, search and pagination
- [x] Appointment scheduling: availability, booking, cancelling and rescheduling, with no double booking
- [x] Medical records: medical history and append-only clinical notes (never edited or deleted)
- [x] Audit log of every access to medical records
- [ ] Real-time chat between patients and the clinic
- [ ] Appointment reminders via WhatsApp
- [ ] File attachments (lab results, images)
- [ ] OpenAPI / Swagger documentation

## Roles

| Role       | Description                                                                           |
| ---------- | ------------------------------------------------------------------------------------- |
| `admin`    | Manages doctors, employees, services and schedules. Has no access to medical records. |
| `doctor`   | Manages their own schedule and their patients' medical records.                       |
| `employee` | Front desk: books appointments and handles the chat.                                  |
| `patient`  | Books their appointments, views their information and uses the chat.                  |

## Tech stack

- **Runtime:** Node.js + TypeScript
- **Web framework:** Express 5
- **Database:** PostgreSQL 18 (Docker)
- **ORM:** Prisma 7 with the `pg` driver adapter
- **Authentication:** JWT (jsonwebtoken) in httpOnly cookies, passwords hashed with bcrypt
- **Validation:** Zod
- **Code quality:** ESLint (typescript-eslint) and Prettier
- **Testing:** Vitest, Supertest and V8 coverage
- **CI:** GitHub Actions and SonarQube Cloud
- **Coming soon:** Socket.IO, WhatsApp Cloud API

## Requirements

- Node.js 22 or later
- npm
- Docker Desktop (or Docker Engine with Docker Compose)

## Getting started

```bash
git clone <repository-url>
cd medical-api
npm install            # also generates the Prisma client
cp .env.example .env   # then fill in the values
npm run db:up          # starts PostgreSQL in Docker
npm run db:migrate     # applies the database migrations
npm run db:seed        # creates the first admin account (ADMIN_EMAIL / ADMIN_PASSWORD)
npm run dev
```

Check that everything works at `GET http://localhost:3000/health`.

> The database is exposed on port **5433** to avoid conflicts with a local PostgreSQL installation using 5432.

## Environment variables

| Variable            | Description                                                                       | Example                                                                 |
| ------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `NODE_ENV`          | Environment: `development`, `test` or `production`                                | `development`                                                           |
| `PORT`              | Port the API runs on                                                              | `3000`                                                                  |
| `POSTGRES_USER`     | PostgreSQL user created by Docker                                                 | `medical`                                                               |
| `POSTGRES_PASSWORD` | PostgreSQL password created by Docker                                             | `medical`                                                               |
| `POSTGRES_DB`       | Database created by Docker                                                        | `medical_api`                                                           |
| `DATABASE_URL`      | Connection string used by Prisma and the API                                      | `postgresql://medical:medical@localhost:5433/medical_api?schema=public` |
| `JWT_SECRET`        | Secret key used to sign JWTs                                                      | a long random string                                                    |
| `CLINIC_TIMEZONE`   | Clinic time zone (IANA). Schedules use local time; appointments are stored in UTC | `America/Mexico_City`                                                   |
| `ADMIN_EMAIL`       | Email of the first admin account created by the seed                              | `admin@clinica.test`                                                    |
| `ADMIN_PASSWORD`    | Password of that admin account (at least 12 characters)                           | a long password                                                         |

The `POSTGRES_*` values must match the user, password and database in `DATABASE_URL`. `ADMIN_*` are only used by `npm run db:seed`.

## Scripts

| Command                 | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| `npm run dev`           | Starts the development server with hot reload                |
| `npm run typecheck`     | Type-checks the code with TypeScript                         |
| `npm run lint`          | Lints the code with ESLint                                   |
| `npm run format`        | Formats the code with Prettier                               |
| `npm run check`         | Runs typecheck, lint, the format check and the unit tests    |
| `npm test`              | Runs all tests (unit and integration)                        |
| `npm run test:unit`     | Runs the unit tests (no database needed)                     |
| `npm run test:int`      | Runs the integration tests against the test database         |
| `npm run test:watch`    | Runs the unit tests in watch mode                            |
| `npm run test:coverage` | Runs all tests and generates the coverage report             |
| `npm run db:up`         | Starts the PostgreSQL container                              |
| `npm run db:down`       | Stops the PostgreSQL container (data is kept)                |
| `npm run db:migrate`    | Creates and applies migrations from the Prisma schema        |
| `npm run db:generate`   | Generates the Prisma client                                  |
| `npm run db:studio`     | Opens Prisma Studio to browse the data                       |
| `npm run db:seed`       | Creates the first admin account (safe to run more than once) |

## Testing

Tests use **Vitest** and live next to the code they test:

| Type        | Files                  | What they cover                                                                                 |
| ----------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| Unit        | `src/**/*.test.ts`     | Pure logic: time and time zone helpers, slot calculation, Zod schemas, appointment status rules |
| Integration | `src/**/*.int.test.ts` | HTTP requests with **Supertest** against a real PostgreSQL database                             |

The integration tests need the database container running (`npm run db:up`). Before they start, Vitest creates a separate database, `medical_api_test`, and applies the migrations to it, so your development data is never touched. Every test starts with empty tables.

The integration tests also check the database rules directly, for example that two requests booking the same slot at the same time end with one `201` and one `409`.

```bash
npm run db:up
npm test               # unit + integration
npm run test:coverage  # report in coverage/index.html
```

### Continuous integration

On every push to `master` and every pull request, [GitHub Actions](.github/workflows/ci.yml) starts a PostgreSQL 18 service and runs the type check, ESLint, the Prettier check and all tests with coverage. The coverage report is then sent to **SonarQube Cloud**, which checks the Quality Gate (bugs, vulnerabilities, code smells, duplication and coverage of new code).

## API endpoints

Access: **Public** (no session), **Authenticated** (any logged-in user), **Admin** (only `admin`).

### Health and authentication

| Method | Path             | Access        | Description                                                                                                                                                                      |
| ------ | ---------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/health`        | Public        | API status and database connection (`200` up, `503` database down)                                                                                                               |
| `POST` | `/auth/register` | Public        | Registers a patient: account and profile (`firstName`, `lastName`, `birthDate`, `phone`, optional `whatsappOptIn`) in one transaction (`201`; `409` if the email already exists) |
| `POST` | `/auth/login`    | Public        | Logs in and sets the `access_token` httpOnly cookie (valid for 1 hour); `403` if the account is disabled                                                                         |
| `POST` | `/auth/logout`   | Public        | Clears the session cookie (`204`)                                                                                                                                                |
| `GET`  | `/auth/me`       | Authenticated | Returns the authenticated user                                                                                                                                                   |

### Users

| Method  | Path         | Access | Description                                                                                                                                                 |
| ------- | ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`  | `/users`     | Admin  | Creates an `admin` or `employee` account. Doctors are created from `/doctors`                                                                               |
| `GET`   | `/users`     | Admin  | Lists users; optional filter `?role=doctor`                                                                                                                 |
| `PATCH` | `/users/:id` | Admin  | Changes a user's role (`admin` ↔ `employee`) and/or `active` status. Admins cannot modify their own account; patient and doctor accounts cannot change role |

### Services

| Method  | Path            | Access        | Description                                                                                     |
| ------- | --------------- | ------------- | ----------------------------------------------------------------------------------------------- |
| `GET`   | `/services`     | Authenticated | Lists active services; admins can add `?includeInactive=true`                                   |
| `GET`   | `/services/:id` | Authenticated | Returns a service                                                                               |
| `POST`  | `/services`     | Admin         | Creates a service (duration between 5 and 480 minutes, multiple of 5; `409` if the name exists) |
| `PATCH` | `/services/:id` | Admin         | Updates a service. Services are deactivated (`active: false`), never deleted                    |

### Doctors

| Method  | Path                    | Access        | Description                                                                                                         |
| ------- | ----------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `GET`   | `/doctors`              | Authenticated | Lists active doctors with their services; filter `?serviceId=` and, for admins, `?includeInactive=true`             |
| `GET`   | `/doctors/:id`          | Authenticated | Returns a doctor (inactive doctors are only visible to admins)                                                      |
| `POST`  | `/doctors`              | Admin         | Creates the doctor's user account and profile in a single transaction (`409` if the email or license number exists) |
| `PATCH` | `/doctors/:id`          | Admin         | Updates the doctor's profile (name, specialty, license number)                                                      |
| `PUT`   | `/doctors/:id/services` | Admin         | Replaces the list of services the doctor offers (`{ "serviceIds": [...] }`)                                         |

To enable or disable a doctor, use `PATCH /users/:userId` with `{ "active": false }`.

### Schedules and time off

| Method   | Path                                     | Access                        | Description                                                                                                                    |
| -------- | ---------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `GET`    | `/doctors/:doctorId/schedule`            | Authenticated                 | Returns the doctor's weekly schedule                                                                                           |
| `PUT`    | `/doctors/:doctorId/schedule`            | Admin or the doctor           | Replaces the weekly schedule (`{ "blocks": [{ "dayOfWeek": 1, "start": "09:00", "end": "14:00" }] }`); `400` if blocks overlap |
| `GET`    | `/doctors/:doctorId/time-off`            | Admin, employee or the doctor | Lists upcoming time off                                                                                                        |
| `POST`   | `/doctors/:doctorId/time-off`            | Admin or the doctor           | Adds time off (`startsAt` and `endsAt` as ISO 8601 with time zone, optional `reason`); `409` if it overlaps                    |
| `DELETE` | `/doctors/:doctorId/time-off/:timeOffId` | Admin or the doctor           | Deletes time off (`204`)                                                                                                       |

Days go from `1` (Monday) to `7` (Sunday). Times use `HH:mm` in the clinic's local time and must be multiples of 5 minutes. A doctor can only manage their own schedule and time off; patients cannot see time off because the reason may be private.

### Patients

| Method  | Path                      | Access                         | Description                                                                                                                                                          |
| ------- | ------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`   | `/patients/me`            | Patient                        | Returns the patient's own profile                                                                                                                                    |
| `GET`   | `/patients/me/access-log` | Patient                        | Who opened the patient's medical record and when (staff name and role only). Paginated                                                                               |
| `GET`   | `/patients`               | Admin or employee              | Paginated search: `?search=` (name in any order, or 4+ digits of the phone), `?page=` and `?pageSize=` (max 100). Returns `patients`, `page`, `pageSize` and `total` |
| `POST`  | `/patients`               | Admin or employee              | Registers a patient without an account (e.g. by phone)                                                                                                               |
| `GET`   | `/patients/:id`           | Admin, employee or the patient | Returns a patient. Other patients get `404`, so ids are not revealed                                                                                                 |
| `PATCH` | `/patients/:id`           | Employee or the patient        | Updates the profile. Admins cannot edit patient data                                                                                                                 |

Phones are accepted as `55 1234 5678`, `(55) 1234-5678` or `+52…` and always stored in E.164 format (`+525512345678`), as WhatsApp requires. `birthDate` uses `YYYY-MM-DD`. `whatsappOptIn` records the patient's consent to receive reminders and defaults to `false`.

### Availability

| Method | Path                                                 | Access        | Description                                                               |
| ------ | ---------------------------------------------------- | ------------- | ------------------------------------------------------------------------- |
| `GET`  | `/availability?doctorId=&serviceId=&date=YYYY-MM-DD` | Authenticated | Free slots for a doctor and service on a date (today up to 90 days ahead) |

Candidate start times are generated every 15 minutes inside the doctor's schedule blocks. A slot is offered only if the whole service fits in the block, it starts in the future and it does not overlap the doctor's time off or active appointments. Each slot includes `startsAt` and `endsAt` in UTC and `time` in the clinic's local time:

```json
{
  "date": "2026-11-09",
  "timeZone": "America/Mexico_City",
  "durationMinutes": 30,
  "slots": [
    {
      "startsAt": "2026-11-09T15:00:00.000Z",
      "endsAt": "2026-11-09T15:30:00.000Z",
      "time": "09:00"
    }
  ]
}
```

### Appointments

| Method  | Path                           | Access                           | Description                                                                                                                                                                                                                                                                 |
| ------- | ------------------------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`  | `/appointments`                | Patient, employee or admin       | Books an appointment (`doctorId`, `serviceId`, `startsAt`, optional `notes`). `startsAt` must be one of the free slots. Staff must send `patientId`; patients always book for themselves. `409` if the slot is taken or the patient already has an appointment at that time |
| `GET`   | `/appointments`                | Authenticated                    | Lists appointments with filters `from`, `to`, `status`, `doctorId`, `patientId` and pagination. Patients only see their own, doctors only their agenda, staff see all                                                                                                       |
| `GET`   | `/appointments/:id`            | The patient, the doctor or staff | Returns an appointment (`404` for anyone else)                                                                                                                                                                                                                              |
| `PATCH` | `/appointments/:id/cancel`     | The patient, the doctor or staff | Cancels an appointment (optional `reason`). Patients need at least 2 hours of notice. Appointments are never deleted                                                                                                                                                        |
| `PATCH` | `/appointments/:id/reschedule` | The patient or staff             | Moves the appointment to another free slot with the same doctor and service (`{ "startsAt": "..." }`). Patients need at least 2 hours of notice                                                                                                                             |
| `PATCH` | `/appointments/:id/status`     | Depends on the change            | `{ "status": "confirmed" \| "completed" \| "no_show" }`, following the state machine below                                                                                                                                                                                  |

Status changes follow a state machine:

| From                                | Allowed changes                                  |
| ----------------------------------- | ------------------------------------------------ |
| `scheduled`                         | `confirmed`, `completed`, `no_show`, `cancelled` |
| `confirmed`                         | `completed`, `no_show`, `cancelled`              |
| `cancelled`, `completed`, `no_show` | none (final states)                              |

Patients (or staff) confirm upcoming appointments; doctors (or staff) record `completed` or `no_show` once the appointment has started. A rescheduled appointment goes back to `scheduled`.

Each appointment includes `startsAt` and `endsAt` in UTC plus `date` and `time` in the clinic's local time. If two requests book the same slot at the same moment, the database accepts one and the other gets `409`.

### Medical records

| Method | Path                                            | Access                         | Description                                                                                                                                                                                       |
| ------ | ----------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/patients/:patientId/medical-history`          | Treating doctor or the patient | Returns the medical history (`null` if there is none yet)                                                                                                                                         |
| `PUT`  | `/patients/:patientId/medical-history`          | Treating doctor                | Creates or replaces the whole history: `bloodType`, `allergies`, `chronicConditions`, `currentMedications`, `surgicalHistory`, `familyHistory`. Missing or empty fields are saved as `null`       |
| `GET`  | `/patients/:patientId/notes`                    | Treating doctor or the patient | Paginated original notes, newest first, each one with its amendments                                                                                                                              |
| `GET`  | `/patients/:patientId/notes/:noteId`            | Treating doctor or the patient | Returns a note with its amendments                                                                                                                                                                |
| `POST` | `/patients/:patientId/notes`                    | Treating doctor                | Creates a SOAP note (`subjective`, `objective`, `assessment`, `plan`), optionally linked to one of the doctor's appointments with the patient (`appointmentId`). One note per appointment (`409`) |
| `POST` | `/patients/:patientId/notes/:noteId/amendments` | Author of the note             | Corrects a note: the full corrected note plus a `reason`. The original never changes                                                                                                              |

- A **treating doctor** has at least one appointment with the patient that was not cancelled. Admins and employees never see clinical content.
- Anyone else gets `404`, so the API does not reveal which patients exist. A patient who tries to change their record gets `403`.
- Notes cannot be edited or deleted. Amendments always point to the original note, and only its author can add them.
- Every read, change and denied attempt is saved in the audit log. A change and its audit entry are saved in the same transaction.

### Audit log

| Method | Path          | Access | Description                                                                                                                                                                      |
| ------ | ------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/audit-logs` | Admin  | Paginated entries, newest first. Filters: `patientId`, `actorId`, `action` (`read`, `create`, `update`, `denied`), `resource` (`medical_history`, `clinical_note`), `from`, `to` |

Each entry stores who (user and role at that moment), what (action, resource and id), which patient, when, the IP and the browser. `details` only holds metadata, such as the names of the changed fields or the ids of the notes that were read, never clinical content.

Requests without a valid session return `401`; requests from a role without permission return `403`. A disabled account loses access immediately.

Errors are returned as `{ "error": "message" }`. Validation errors (`400`) also include `details` with `fieldErrors` (messages for each field) and `formErrors` (errors about the request as a whole).

## Data model

| Table               | Description                                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users`             | Accounts: email, password hash, role and `active` status                                                                                                                 |
| `doctors`           | Doctor profile (1:1 with `users`): name, specialty and unique license number                                                                                             |
| `services`          | Services offered by the clinic, with their duration in minutes                                                                                                           |
| `doctor_services`   | Many-to-many relation: which services each doctor offers                                                                                                                 |
| `schedule_blocks`   | Weekly schedule: day (1 = Monday … 7 = Sunday) and start/end in minutes since midnight, clinic time                                                                      |
| `patients`          | Patient profile: name, birth date, phone (E.164) and WhatsApp consent. The user account is optional                                                                      |
| `time_off`          | Days off and absences of each doctor (exact start and end timestamps)                                                                                                    |
| `appointments`      | Appointments: patient, doctor, service, start and end (UTC), status (`scheduled`, `confirmed`, `cancelled`, `completed`, `no_show`) and cancellation data. Never deleted |
| `medical_histories` | Medical history of each patient (1:1): blood type, allergies, chronic conditions, medications, surgical and family history, and who last updated it                      |
| `clinical_notes`    | SOAP notes, optionally linked to an appointment (one note per appointment). Amendments are new rows that point to the original note. Append-only                         |
| `audit_logs`        | Who accessed or changed which medical record and when, including denied attempts. Metadata only. Append-only                                                             |

Besides the validation in the API, the database enforces its own rules with `CHECK` constraints (service durations, valid days and hours, time off ranges, blood types and amendment rules). `clinical_notes` and `audit_logs` are **append-only**: a trigger rejects any `UPDATE` or `DELETE`, so not even a bug or a manual query can alter a note or the audit log.

### Double booking prevention

The `appointments` table has a PostgreSQL `EXCLUDE` constraint (with the `btree_gist` extension): a doctor cannot have two active appointments (`scheduled` or `confirmed`) whose time ranges overlap. The database enforces it, so it also holds when two requests try to book the same slot at the same moment, which a check in the code alone cannot guarantee. Cancelled appointments free the slot.

## Project structure

```
.github/
└── workflows/ci.yml        # CI: types, lint, format, tests and SonarQube analysis
prisma/
├── schema.prisma          # database models
└── migrations/            # SQL migration history (including CHECK constraints)
src/
├── index.ts               # starts the server and handles shutdown
├── app.ts                 # creates and configures the Express app
├── config/
│   └── env.ts             # environment variables validated with Zod
├── db/
│   ├── prisma.ts          # Prisma client instance
│   └── seed.ts            # creates the first admin account
├── generated/             # generated Prisma client (not committed)
├── shared/
│   ├── errors/            # custom error classes
│   ├── middlewares/       # 404 and error handlers
│   ├── schemas/           # shared Zod schemas (ids, names, pagination, PATCH helpers)
│   └── utils/             # helpers: omitUndefined, HH:mm ↔ minutes, clinic time zone ↔ UTC
├── test/
│   ├── global-setup.ts    # creates the test database and applies the migrations
│   └── helpers.ts         # app instance, table reset, data factories and login helpers
├── types/
│   └── express.d.ts       # adds `user` to the Express request type
└── modules/
    ├── appointments/
    │   ├── appointments.constants.ts  # active statuses, booking rules, STATUS_TRANSITIONS
    │   ├── appointments.controller.ts
    │   ├── appointments.errors.ts     # detects the double booking error from PostgreSQL
    │   ├── appointments.repository.ts
    │   ├── appointments.routes.ts
    │   ├── appointments.schema.ts
    │   ├── appointments.service.ts    # booking, role-scoped lists, cancel, reschedule, state machine
    │   ├── appointments.types.ts      # response with local date and time
    │   ├── availability.controller.ts
    │   ├── availability.routes.ts
    │   ├── availability.service.ts    # loads schedule, time off and appointments in parallel
    │   └── availability.ts            # computeSlots: pure function, no database access
    ├── audit/
    │   ├── audit.controller.ts
    │   ├── audit.repository.ts
    │   ├── audit.routes.ts        # GET /audit-logs (admin)
    │   ├── audit.schema.ts        # filters: patient, user, action, resource, dates
    │   ├── audit.service.ts       # record() (can run inside a transaction), admin log, patient access log
    │   └── audit.types.ts         # request context and responses without clinical content
    ├── auth/
    │   ├── auth.constants.ts
    │   ├── auth.controller.ts
    │   ├── auth.middleware.ts   # authenticate (session) and requireRole (permissions)
    │   ├── auth.routes.ts
    │   └── auth.service.ts      # business rules (hashing, JWT)
    ├── doctors/
    │   ├── doctors.controller.ts
    │   ├── doctors.repository.ts  # queries, nested writes and transactions
    │   ├── doctors.routes.ts
    │   ├── doctors.schema.ts
    │   ├── doctors.service.ts     # business rules (unique email and license)
    │   └── doctors.types.ts       # response mapping
    ├── health/
    │   └── health.routes.ts
    ├── medical-records/
    │   ├── clinical-notes.controller.ts
    │   ├── clinical-notes.service.ts     # SOAP notes, one per appointment, amendments by the author
    │   ├── medical-history.controller.ts
    │   ├── medical-history.service.ts    # PUT replaces the history; audits changed field names
    │   ├── medical-records.access.ts     # who can open a record (patient or treating doctor)
    │   ├── medical-records.constants.ts
    │   ├── medical-records.repository.ts
    │   ├── medical-records.routes.ts     # mounted under /patients/:patientId
    │   ├── medical-records.schema.ts
    │   └── medical-records.types.ts
    ├── patients/
    │   ├── patients.controller.ts
    │   ├── patients.repository.ts   # search and pagination
    │   ├── patients.routes.ts
    │   ├── patients.schema.ts       # phone normalization and dates
    │   ├── patients.service.ts      # access rules (staff or the patient)
    │   └── patients.types.ts
    ├── schedules/
    │   ├── schedules.controller.ts
    │   ├── schedules.repository.ts
    │   ├── schedules.routes.ts      # mounted under /doctors/:doctorId
    │   ├── schedules.schema.ts      # HH:mm validation and overlap checks
    │   └── schedules.service.ts     # permissions: admin or the doctor themselves
    ├── services/
    │   ├── services.controller.ts
    │   ├── services.repository.ts
    │   ├── services.routes.ts
    │   └── services.schema.ts
    └── users/
        ├── users.controller.ts
        ├── users.repository.ts  # database access with Prisma
        ├── users.routes.ts
        ├── users.schema.ts
        ├── users.service.ts     # business rules for user management
        └── users.types.ts
```

Each module groups its validation schema, types, data access, controller and routes.

## Roadmap

1. ~~Base setup: TypeScript, linting, Express, error handling and `/health` endpoint~~ ✅
2. ~~PostgreSQL with Docker and Prisma~~ ✅
3. ~~Authentication and roles~~ ✅
4. ~~Catalogs: doctors, services and schedules~~ ✅
5. ~~Appointments and availability~~ ✅
6. ~~Automated tests (Vitest), CI and code coverage (SonarQube)~~ ✅
7. ~~Medical records and audit log~~ ✅
8. Real-time chat
9. WhatsApp reminders
10. File attachments
11. Documentation, security and deployment

## Data privacy

Health data is sensitive personal data. The design follows the principles of the Mexican standards NOM-004-SSA3-2012 (medical records) and NOM-024-SSA3-2012 (electronic health record information systems): role-restricted access, append-only clinical notes and an audit log. This project is not certified for real clinical use.
