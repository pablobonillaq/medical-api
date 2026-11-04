**English** | [Español](README.es.md)

# Medical API

REST API for managing a multi-doctor clinic: appointment scheduling, electronic medical records, patient–clinic chat, and appointment reminders via WhatsApp.

> **Status:** in development. Phases 1–4 completed (base setup, database, authentication and roles, catalogs). Phase 5 in progress: patient profiles and availability are done; booking, cancelling and rescheduling are next.
> Portfolio project. All test data is **fictitious**.

## Features

- [x] JWT authentication with cookies and role-based access control
- [x] Management of doctors, services, schedules and days off
- [x] Patient profiles: self-registration or front-desk registration, search and pagination
- [ ] Appointment scheduling: availability, booking, cancelling and rescheduling, with no double booking
- [ ] Medical records: medical history and append-only clinical notes (never edited or deleted)
- [ ] Audit log of every access to medical records
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
- **Coming soon:** Socket.IO, WhatsApp Cloud API, Vitest

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

| Command               | Description                                                  |
| --------------------- | ------------------------------------------------------------ |
| `npm run dev`         | Starts the development server with hot reload                |
| `npm run typecheck`   | Type-checks the code with TypeScript                         |
| `npm run lint`        | Lints the code with ESLint                                   |
| `npm run format`      | Formats the code with Prettier                               |
| `npm run check`       | Runs typecheck, lint and the format check                    |
| `npm run db:up`       | Starts the PostgreSQL container                              |
| `npm run db:down`     | Stops the PostgreSQL container (data is kept)                |
| `npm run db:migrate`  | Creates and applies migrations from the Prisma schema        |
| `npm run db:generate` | Generates the Prisma client                                  |
| `npm run db:studio`   | Opens Prisma Studio to browse the data                       |
| `npm run db:seed`     | Creates the first admin account (safe to run more than once) |

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

| Method  | Path            | Access                         | Description                                                                                                                                                          |
| ------- | --------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`   | `/patients/me`  | Patient                        | Returns the patient's own profile                                                                                                                                    |
| `GET`   | `/patients`     | Admin or employee              | Paginated search: `?search=` (name in any order, or 4+ digits of the phone), `?page=` and `?pageSize=` (max 100). Returns `patients`, `page`, `pageSize` and `total` |
| `POST`  | `/patients`     | Admin or employee              | Registers a patient without an account (e.g. by phone)                                                                                                               |
| `GET`   | `/patients/:id` | Admin, employee or the patient | Returns a patient. Other patients get `404`, so ids are not revealed                                                                                                 |
| `PATCH` | `/patients/:id` | Employee or the patient        | Updates the profile. Admins cannot edit patient data                                                                                                                 |

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

Requests without a valid session return `401`; requests from a role without permission return `403`. A disabled account loses access immediately.

Errors are returned as `{ "error": "message" }`. Validation errors (`400`) also include `details` with `fieldErrors` (messages for each field) and `formErrors` (errors about the request as a whole).

## Data model

| Table             | Description                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users`           | Accounts: email, password hash, role and `active` status                                                                                                                 |
| `doctors`         | Doctor profile (1:1 with `users`): name, specialty and unique license number                                                                                             |
| `services`        | Services offered by the clinic, with their duration in minutes                                                                                                           |
| `doctor_services` | Many-to-many relation: which services each doctor offers                                                                                                                 |
| `schedule_blocks` | Weekly schedule: day (1 = Monday … 7 = Sunday) and start/end in minutes since midnight, clinic time                                                                      |
| `patients`        | Patient profile: name, birth date, phone (E.164) and WhatsApp consent. The user account is optional                                                                      |
| `time_off`        | Days off and absences of each doctor (exact start and end timestamps)                                                                                                    |
| `appointments`    | Appointments: patient, doctor, service, start and end (UTC), status (`scheduled`, `confirmed`, `cancelled`, `completed`, `no_show`) and cancellation data. Never deleted |

Besides the validation in the API, the database enforces its own rules with `CHECK` constraints (service durations, valid days and hours, time off ranges).

### Double booking prevention

The `appointments` table has a PostgreSQL `EXCLUDE` constraint (with the `btree_gist` extension): a doctor cannot have two active appointments (`scheduled` or `confirmed`) whose time ranges overlap. The database enforces it, so it also holds when two requests try to book the same slot at the same moment, which a check in the code alone cannot guarantee. Cancelled appointments free the slot.

## Project structure

```
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
├── types/
│   └── express.d.ts       # adds `user` to the Express request type
└── modules/
    ├── appointments/
    │   ├── appointments.constants.ts  # active statuses, slot step, booking window
    │   ├── appointments.repository.ts
    │   ├── appointments.schema.ts
    │   ├── availability.controller.ts
    │   ├── availability.routes.ts
    │   ├── availability.service.ts    # loads schedule, time off and appointments in parallel
    │   └── availability.ts            # computeSlots: pure function, no database access
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
5. Appointments and availability (in progress)
6. Medical records and audit log
7. Real-time chat
8. WhatsApp reminders
9. File attachments
10. Documentation, security and deployment

## Data privacy

Health data is sensitive personal data. The design follows the principles of the Mexican standards NOM-004-SSA3-2012 (medical records) and NOM-024-SSA3-2012 (electronic health record information systems): role-restricted access, append-only clinical notes and an audit log. This project is not certified for real clinical use.
