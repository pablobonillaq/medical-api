**English** | [Español](README.es.md)

# Medical API

REST API for managing a multi-doctor clinic: appointment scheduling, electronic medical records, patient–clinic chat, and appointment reminders via WhatsApp.

> **Status:** in development. Phases 1–3 completed (base setup, database, authentication and roles); next: phase 4, catalogs.
> Portfolio project. All test data is **fictitious**.

## Features

- [x] JWT authentication with cookies and role-based access control
- [ ] Management of doctors, services, schedules and days off
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

| Variable            | Description                                             | Example                                                                 |
| ------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `NODE_ENV`          | Environment: `development`, `test` or `production`      | `development`                                                           |
| `PORT`              | Port the API runs on                                    | `3000`                                                                  |
| `POSTGRES_USER`     | PostgreSQL user created by Docker                       | `medical`                                                               |
| `POSTGRES_PASSWORD` | PostgreSQL password created by Docker                   | `medical`                                                               |
| `POSTGRES_DB`       | Database created by Docker                              | `medical_api`                                                           |
| `DATABASE_URL`      | Connection string used by Prisma and the API            | `postgresql://medical:medical@localhost:5433/medical_api?schema=public` |
| `JWT_SECRET`        | Secret key used to sign JWTs                            | a long random string                                                    |
| `ADMIN_EMAIL`       | Email of the first admin account created by the seed    | `admin@clinica.test`                                                    |
| `ADMIN_PASSWORD`    | Password of that admin account (at least 12 characters) | a long password                                                         |

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

| Method  | Path             | Access        | Description                                                                                                                   |
| ------- | ---------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET`   | `/health`        | Public        | API status and database connection (`200` up, `503` database down)                                                            |
| `POST`  | `/auth/register` | Public        | Registers a patient account (`201`; `409` if the email already exists)                                                        |
| `POST`  | `/auth/login`    | Public        | Logs in and sets the `access_token` httpOnly cookie (valid for 1 hour); `403` if the account is disabled                      |
| `POST`  | `/auth/logout`   | Public        | Clears the session cookie (`204`)                                                                                             |
| `GET`   | `/auth/me`       | Authenticated | Returns the authenticated user                                                                                                |
| `POST`  | `/users`         | Admin         | Creates a staff account (`admin`, `doctor` or `employee`)                                                                     |
| `GET`   | `/users`         | Admin         | Lists users; optional filter `?role=doctor`                                                                                   |
| `PATCH` | `/users/:id`     | Admin         | Changes a user's role and/or `active` status. Admins cannot modify their own account, and patient accounts cannot change role |

Requests without a valid session return `401`; requests from a role without permission return `403`. A disabled account loses access immediately.

Errors are returned as `{ "error": "message" }`. Validation errors (`400`) also include `details` with `fieldErrors` (messages for each field) and `formErrors` (errors about the request as a whole).

## Project structure

```
prisma/
├── schema.prisma          # database models
└── migrations/            # SQL migration history
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
│   └── middlewares/       # 404 and error handlers
├── types/
│   └── express.d.ts       # adds `user` to the Express request type
└── modules/
    ├── auth/
    │   ├── auth.constants.ts
    │   ├── auth.controller.ts
    │   ├── auth.middleware.ts   # authenticate (session) and requireRole (permissions)
    │   ├── auth.routes.ts
    │   └── auth.service.ts      # business rules (hashing, JWT)
    ├── health/
    │   └── health.routes.ts
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
4. Catalogs: doctors, services and schedules
5. Appointments and availability
6. Medical records and audit log
7. Real-time chat
8. WhatsApp reminders
9. File attachments
10. Documentation, security and deployment

## Data privacy

Health data is sensitive personal data. The design follows the principles of the Mexican standards NOM-004-SSA3-2012 (medical records) and NOM-024-SSA3-2012 (electronic health record information systems): role-restricted access, append-only clinical notes and an audit log. This project is not certified for real clinical use.
