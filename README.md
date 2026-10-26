**English** | [Español](README.es.md)

# Medical API

REST API for managing a multi-doctor clinic: appointment scheduling, electronic medical records, patient–clinic chat, and appointment reminders via WhatsApp.

> **Status:** in development (phase 1: base setup and users module).
> Portfolio project. All test data is **fictitious**.

## Features

- [ ] JWT authentication with cookies and role-based access control
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
- **Validation:** Zod
- **Code quality:** ESLint (typescript-eslint) and Prettier
- **Coming soon:** Express, PostgreSQL, Socket.IO, WhatsApp Cloud API, Vitest, Docker

## Requirements

- Node.js 22 or later
- npm

## Getting started

```bash
git clone <repository-url>
cd medical-api
npm install
cp .env.example .env   # then fill in the values
npm run dev
```

## Environment variables

| Variable       | Description                  |
| -------------- | ---------------------------- |
| `PORT`         | Port the API runs on         |
| `DATABASE_URL` | Database connection string   |
| `JWT_SECRET`   | Secret key used to sign JWTs |

## Scripts

| Command             | Description                                   |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Starts the development server with hot reload |
| `npm run typecheck` | Type-checks the code with TypeScript          |
| `npm run lint`      | Lints the code with ESLint                    |
| `npm run format`    | Formats the code with Prettier                |
| `npm run check`     | Runs typecheck, lint and the format check     |

## Project structure

```
src/
├── index.ts
└── modules/
    └── users/
        ├── users.controller.ts
        ├── users.model.ts
        ├── users.routes.ts
        ├── users.schema.ts
        └── users.types.ts
```

Each module groups its validation schema, types, model, controller and routes.

## Roadmap

1. Base setup: TypeScript, linting, Express, error handling and `/health` endpoint
2. Authentication and roles
3. Catalogs: doctors, services and schedules
4. Appointments and availability
5. Medical records and audit log
6. Real-time chat
7. WhatsApp reminders
8. File attachments
9. Documentation, security and deployment

## Data privacy

Health data is sensitive personal data. The design follows the principles of the Mexican standards NOM-004-SSA3-2012 (medical records) and NOM-024-SSA3-2012 (electronic health record information systems): role-restricted access, append-only clinical notes and an audit log. This project is not certified for real clinical use.
