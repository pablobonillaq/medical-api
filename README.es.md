[English](README.md) | **Español**

# Medical API

[![CI](https://github.com/pablobonillaq/medical-api/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/pablobonillaq/medical-api/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=pablobonillaq_medical-api&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=pablobonillaq_medical-api)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=pablobonillaq_medical-api&metric=coverage)](https://sonarcloud.io/summary/new_code?id=pablobonillaq_medical-api)

API REST para la gestión de una clínica con varios médicos: agenda de citas, expedientes clínicos, chat entre pacientes y clínica, y recordatorios de citas por correo (WhatsApp más adelante).

> **Estado:** en desarrollo. Fases 1–10 completadas (configuración base, base de datos, autenticación y roles, catálogos, citas, pruebas e integración continua, expediente clínico y auditoría, chat en tiempo real, recordatorios de citas por correo, archivos adjuntos). Fase 11 en curso: la documentación con OpenAPI y el refuerzo de seguridad están listos; sigue el despliegue. WhatsApp se agregará después como un segundo canal de recordatorios.
> Proyecto de portafolio. Todos los datos de pruebas son **ficticios**.

## Funcionalidades

- [x] Autenticación con JWT en cookies y control de acceso por roles
- [x] Gestión de médicos, servicios, horarios y días no laborables
- [x] Perfiles de pacientes: registro propio o por recepción, búsqueda y paginación
- [x] Agenda de citas: disponibilidad, agendar, cancelar y reprogramar, sin doble agendado
- [x] Expediente clínico: antecedentes y notas clínicas que no se editan ni se borran
- [x] Registro de auditoría de cada acceso a expedientes
- [x] Chat en tiempo real entre pacientes y clínica
- [x] Recordatorios de citas por correo, enviados por un proceso en segundo plano (canal de WhatsApp pendiente)
- [x] Archivos adjuntos (estudios de laboratorio, imágenes)
- [x] Documentación con OpenAPI y Swagger UI (no se sirve en producción)

## Roles

| Rol        | Descripción                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------- |
| `admin`    | Administra médicos, empleados, servicios y horarios. No tiene acceso a expedientes clínicos. |
| `doctor`   | Gestiona su agenda y los expedientes de sus pacientes.                                       |
| `employee` | Recepción: agenda citas y atiende el chat.                                                   |
| `patient`  | Agenda sus citas, consulta su información y usa el chat.                                     |

## Tecnologías

- **Runtime:** Node.js + TypeScript
- **Framework web:** Express 5
- **Base de datos:** PostgreSQL 18 (Docker)
- **ORM:** Prisma 7 con el driver adapter de `pg`
- **Autenticación:** JWT (jsonwebtoken) en cookies httpOnly, contraseñas hasheadas con bcrypt
- **Validación:** Zod
- **Calidad de código:** ESLint (typescript-eslint) y Prettier
- **Pruebas:** Vitest, Supertest y cobertura con V8
- **Integración continua:** GitHub Actions y SonarQube Cloud
- **Tiempo real:** Socket.IO
- **Subida de archivos:** Multer (en memoria), guardados en disco detrás de una interfaz de almacenamiento
- **Correo:** Nodemailer (SMTP), con Mailpit atrapando todos los correos en desarrollo
- **Seguridad:** Helmet (encabezados de seguridad) y express-rate-limit
- **Documentación de la API:** OpenAPI 3.1 generado desde los esquemas de Zod (zod-openapi) y Swagger UI
- **Por agregar:** WhatsApp Cloud API

## Requisitos

- Node.js 22 o superior
- npm
- Docker Desktop (o Docker Engine con Docker Compose)

## Instalación

```bash
git clone <url-del-repositorio>
cd medical-api
npm install            # también genera el cliente de Prisma
cp .env.example .env   # y completa los valores
npm run db:up          # levanta PostgreSQL y Mailpit en Docker
npm run db:migrate     # aplica las migraciones
npm run db:seed        # crea la primera cuenta de admin (ADMIN_EMAIL / ADMIN_PASSWORD)
npm run dev
```

Comprueba que todo funciona en `GET http://localhost:3000/health`.

La documentación interactiva de la API está en `http://localhost:3000/docs`, y el documento OpenAPI en `/openapi.json`. Inicia sesión con `POST /auth/login` desde esa página y las demás peticiones usan la misma sesión. Ninguno de los dos se sirve en producción.

Para probar el chat, abre `http://localhost:3000/demo/chat.html` en dos ventanas del navegador (una privada): inicia sesión como paciente en una y como empleado de recepción en la otra. La página de prueba no se sirve en producción.

Todos los correos (como los recordatorios de citas) llegan a Mailpit, nunca a buzones reales: ábrelo en `http://localhost:8025` para leerlos. `npm run mail:test` envía un recordatorio de ejemplo.

> La base de datos se expone en el puerto **5433** para no chocar con una instalación local de PostgreSQL que use el 5432.

## Variables de entorno

| Variable             | Descripción                                                                                                  | Ejemplo                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `NODE_ENV`           | Entorno: `development`, `test` o `production`                                                                | `development`                                                           |
| `PORT`               | Puerto en el que corre la API                                                                                | `3000`                                                                  |
| `POSTGRES_USER`      | Usuario de PostgreSQL que crea Docker                                                                        | `medical`                                                               |
| `POSTGRES_PASSWORD`  | Contraseña de PostgreSQL que crea Docker                                                                     | `medical`                                                               |
| `POSTGRES_DB`        | Base de datos que crea Docker                                                                                | `medical_api`                                                           |
| `DATABASE_URL`       | Cadena de conexión que usan Prisma y la API                                                                  | `postgresql://medical:medical@localhost:5433/medical_api?schema=public` |
| `JWT_SECRET`         | Clave para firmar los tokens JWT                                                                             | una cadena larga y aleatoria                                            |
| `CLINIC_TIMEZONE`    | Zona horaria de la clínica (IANA). Los horarios usan hora local; las citas se guardan en UTC                 | `America/Mexico_City`                                                   |
| `UPLOADS_DIR`        | Carpeta de los archivos subidos (relativa a donde se inicia la API). Nunca se sube a git                     | `storage/uploads`                                                       |
| `CLINIC_NAME`        | Nombre de la clínica en los mensajes a pacientes                                                             | `Clínica`                                                               |
| `SMTP_HOST`          | Servidor SMTP para enviar correos (Mailpit en desarrollo)                                                    | `localhost`                                                             |
| `SMTP_PORT`          | Puerto SMTP                                                                                                  | `1025`                                                                  |
| `SMTP_SECURE`        | Usar TLS desde el inicio de la conexión (normalmente `true` con el puerto 465)                               | `false`                                                                 |
| `SMTP_USER`          | Usuario SMTP (omítelo junto con `SMTP_PASSWORD` si no se necesita)                                           |                                                                         |
| `SMTP_PASSWORD`      | Contraseña SMTP                                                                                              |                                                                         |
| `MAIL_FROM`          | Remitente de los correos                                                                                     | `Clínica <no-reply@clinica.test>`                                       |
| `REMINDERS_ENABLED`  | Inicia el proceso que envía los recordatorios                                                                | `true`                                                                  |
| `TRUST_PROXY`        | Cuántos proxies hay delante de la API (0: ninguno). Necesario para leer la IP del cliente detrás de un proxy | `0`                                                                     |
| `RATE_LIMIT_ENABLED` | Activa o desactiva los límites de peticiones (solo las pruebas los desactivan)                               | `true`                                                                  |
| `ADMIN_EMAIL`        | Email de la primera cuenta de admin que crea el seed                                                         | `admin@clinica.test`                                                    |
| `ADMIN_PASSWORD`     | Contraseña de esa cuenta de admin (mínimo 12 caracteres)                                                     | una contraseña larga                                                    |

Los valores de `POSTGRES_*` deben coincidir con el usuario, la contraseña y la base de datos de `DATABASE_URL`. Las variables `ADMIN_*` solo las usa `npm run db:seed`.

## Scripts

| Comando                 | Descripción                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `npm run dev`           | Inicia el servidor en modo desarrollo con recarga automática                            |
| `npm run typecheck`     | Verifica los tipos con TypeScript                                                       |
| `npm run lint`          | Revisa el código con ESLint                                                             |
| `npm run format`        | Formatea el código con Prettier                                                         |
| `npm run check`         | Ejecuta typecheck, lint, la revisión de formato y las pruebas unitarias                 |
| `npm test`              | Ejecuta todas las pruebas (unitarias y de integración)                                  |
| `npm run test:unit`     | Ejecuta las pruebas unitarias (no necesitan base de datos)                              |
| `npm run test:int`      | Ejecuta las pruebas de integración con la base de datos de pruebas                      |
| `npm run test:watch`    | Ejecuta las pruebas unitarias en modo watch                                             |
| `npm run test:coverage` | Ejecuta todas las pruebas y genera el reporte de cobertura                              |
| `npm run db:up`         | Levanta el contenedor de PostgreSQL                                                     |
| `npm run db:down`       | Detiene el contenedor de PostgreSQL (los datos se conservan)                            |
| `npm run db:migrate`    | Crea y aplica migraciones a partir del schema de Prisma                                 |
| `npm run db:generate`   | Genera el cliente de Prisma                                                             |
| `npm run db:studio`     | Abre Prisma Studio para ver los datos                                                   |
| `npm run db:seed`       | Crea la primera cuenta de admin (se puede ejecutar varias veces)                        |
| `npm run mail:test`     | Envía un recordatorio de ejemplo por el servidor SMTP configurado (Mailpit por defecto) |

## Pruebas

Las pruebas usan **Vitest** y están junto al código que prueban:

| Tipo        | Archivos               | Qué cubren                                                                                                                                                                              |
| ----------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unitarias   | `src/**/*.test.ts`     | Lógica pura: utilidades de hora y zona horaria, cálculo de horarios disponibles, schemas de Zod, reglas de estado de las citas, detección del tipo de archivo, conversión de respuestas |
| Integración | `src/**/*.int.test.ts` | Peticiones HTTP con **Supertest** y clientes de Socket.IO contra una base de datos PostgreSQL real                                                                                      |

Las pruebas de integración necesitan el contenedor de la base de datos encendido (`npm run db:up`). Antes de empezar, Vitest crea una base de datos aparte, `medical_api_test`, y le aplica las migraciones, así que los datos de desarrollo nunca se tocan. Cada prueba empieza con las tablas vacías.

Las pruebas de integración también verifican las reglas de la base de datos directamente; por ejemplo, que dos peticiones que agendan el mismo horario al mismo tiempo terminen con un `201` y un `409`. El worker de recordatorios corre contra la misma base de datos con un transporte de correo en memoria, así que nunca se envía un correo.

La cobertura se mantiene en **100 %** de líneas, ramas, funciones y sentencias: `npm run test:coverage` falla si alguna baja (ver `coverage.thresholds` en `vitest.config.ts`). Las ramas que nunca podían ejecutarse se eliminaron en lugar de excluirlas con comentarios `/* v8 ignore */`.

```bash
npm run db:up
npm test               # unitarias + integración
npm run test:coverage  # reporte en coverage/index.html
```

### Integración continua

En cada push a `master` y en cada pull request, [GitHub Actions](.github/workflows/ci.yml) levanta un servicio de PostgreSQL 18 y ejecuta la verificación de tipos, ESLint, la revisión de Prettier y todas las pruebas con cobertura. Después envía el reporte de cobertura a **SonarQube Cloud**, que evalúa el Quality Gate (bugs, vulnerabilidades, code smells, duplicación y cobertura del código nuevo).

## Endpoints

La referencia completa, con cada campo y sus reglas, está en Swagger UI en `/docs` (ver [Instalación](#instalación)).

Acceso: **Público** (sin sesión), **Autenticado** (cualquier usuario con sesión), **Admin** (solo `admin`).

### Estado y autenticación

| Método | Ruta             | Acceso      | Descripción                                                                                                                                                                  |
| ------ | ---------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/health`        | Público     | Estado de la API y de la conexión a la base de datos (`200` disponible, `503` base de datos caída)                                                                           |
| `POST` | `/auth/register` | Público     | Registra un paciente: cuenta y perfil (`firstName`, `lastName`, `birthDate`, `phone`, `whatsappOptIn` opcional) en una sola transacción (`201`; `409` si el email ya existe) |
| `POST` | `/auth/login`    | Público     | Inicia sesión y crea la cookie httpOnly `access_token` (válida por 1 hora); `403` si la cuenta está desactivada                                                              |
| `POST` | `/auth/logout`   | Público     | Borra la cookie de sesión (`204`)                                                                                                                                            |
| `GET`  | `/auth/me`       | Autenticado | Devuelve el usuario autenticado                                                                                                                                              |

### Usuarios

| Método  | Ruta         | Acceso | Descripción                                                                                                                                                                           |
| ------- | ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`  | `/users`     | Admin  | Crea una cuenta `admin` o `employee`. Los médicos se crean desde `/doctors`                                                                                                           |
| `GET`   | `/users`     | Admin  | Lista usuarios; filtro opcional `?role=doctor`                                                                                                                                        |
| `PATCH` | `/users/:id` | Admin  | Cambia el rol (`admin` ↔ `employee`) y/o el estado `active` de un usuario. Un admin no puede modificar su propia cuenta; las cuentas de paciente y de médico no pueden cambiar de rol |

### Servicios

| Método  | Ruta            | Acceso      | Descripción                                                                                 |
| ------- | --------------- | ----------- | ------------------------------------------------------------------------------------------- |
| `GET`   | `/services`     | Autenticado | Lista los servicios activos; el admin puede agregar `?includeInactive=true`                 |
| `GET`   | `/services/:id` | Autenticado | Devuelve un servicio                                                                        |
| `POST`  | `/services`     | Admin       | Crea un servicio (duración entre 5 y 480 minutos, múltiplo de 5; `409` si el nombre existe) |
| `PATCH` | `/services/:id` | Admin       | Actualiza un servicio. Los servicios se desactivan (`active: false`), nunca se borran       |

### Médicos

| Método  | Ruta                    | Acceso      | Descripción                                                                                                         |
| ------- | ----------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `GET`   | `/doctors`              | Autenticado | Lista los médicos activos con sus servicios; filtro `?serviceId=` y, para el admin, `?includeInactive=true`         |
| `GET`   | `/doctors/:id`          | Autenticado | Devuelve un médico (los médicos inactivos solo los ve el admin)                                                     |
| `POST`  | `/doctors`              | Admin       | Crea la cuenta de usuario y el perfil del médico en una sola transacción (`409` si el email o la cédula ya existen) |
| `PATCH` | `/doctors/:id`          | Admin       | Actualiza el perfil del médico (nombre, especialidad, cédula)                                                       |
| `PUT`   | `/doctors/:id/services` | Admin       | Reemplaza la lista de servicios que ofrece el médico (`{ "serviceIds": [...] }`)                                    |

Para activar o desactivar a un médico se usa `PATCH /users/:userId` con `{ "active": false }`.

### Horarios y días libres

| Método   | Ruta                                     | Acceso                      | Descripción                                                                                                                             |
| -------- | ---------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/doctors/:doctorId/schedule`            | Autenticado                 | Devuelve el horario semanal del médico                                                                                                  |
| `PUT`    | `/doctors/:doctorId/schedule`            | Admin o el médico           | Reemplaza el horario semanal (`{ "blocks": [{ "dayOfWeek": 1, "start": "09:00", "end": "14:00" }] }`); `400` si hay bloques traslapados |
| `GET`    | `/doctors/:doctorId/time-off`            | Admin, empleado o el médico | Lista los próximos días libres                                                                                                          |
| `POST`   | `/doctors/:doctorId/time-off`            | Admin o el médico           | Agrega un día libre (`startsAt` y `endsAt` en ISO 8601 con zona horaria, `reason` opcional); `409` si se traslapa                       |
| `DELETE` | `/doctors/:doctorId/time-off/:timeOffId` | Admin o el médico           | Borra un día libre (`204`)                                                                                                              |

Los días van de `1` (lunes) a `7` (domingo). Las horas usan `HH:mm` en hora local de la clínica y deben ser múltiplos de 5 minutos. Un médico solo puede administrar su propio horario y sus días libres; los pacientes no ven los días libres porque el motivo puede ser privado.

### Pacientes

| Método  | Ruta                      | Acceso                        | Descripción                                                                                                                                                                        |
| ------- | ------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`   | `/patients/me`            | Paciente                      | Devuelve el perfil del propio paciente                                                                                                                                             |
| `GET`   | `/patients/me/access-log` | Paciente                      | Quién consultó el expediente del paciente y cuándo (solo nombre y rol del personal). Paginado                                                                                      |
| `GET`   | `/patients`               | Admin o empleado              | Búsqueda paginada: `?search=` (nombre en cualquier orden, o 4 o más dígitos del teléfono), `?page=` y `?pageSize=` (máximo 100). Devuelve `patients`, `page`, `pageSize` y `total` |
| `POST`  | `/patients`               | Admin o empleado              | Registra un paciente sin cuenta (por ejemplo, por teléfono)                                                                                                                        |
| `GET`   | `/patients/:id`           | Admin, empleado o el paciente | Devuelve un paciente. Para otros pacientes responde `404`, así no se revelan ids                                                                                                   |
| `PATCH` | `/patients/:id`           | Empleado o el paciente        | Actualiza el perfil. El admin no puede editar datos de pacientes                                                                                                                   |

El teléfono se acepta como `55 1234 5678`, `(55) 1234-5678` o `+52…` y siempre se guarda en formato E.164 (`+525512345678`), como lo exige WhatsApp. `birthDate` usa `AAAA-MM-DD`. `whatsappOptIn` y `emailRemindersOptIn` guardan el consentimiento del paciente para recibir recordatorios por cada canal y por defecto son `false`. `contactEmail` es un correo opcional para recordatorios, útil para pacientes sin cuenta (`null` lo borra); si está vacío, se usa el correo de la cuenta.

### Disponibilidad

| Método | Ruta                                                 | Acceso      | Descripción                                                                                   |
| ------ | ---------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| `GET`  | `/availability?doctorId=&serviceId=&date=AAAA-MM-DD` | Autenticado | Horarios libres de un médico para un servicio en una fecha (desde hoy hasta 90 días adelante) |

Se prueban horas de inicio cada 15 minutos dentro de los bloques del horario del médico. Un horario se ofrece solo si el servicio completo cabe en el bloque, empieza en el futuro y no se traslapa con los días libres ni con las citas activas del médico. Cada horario incluye `startsAt` y `endsAt` en UTC, y `time` en hora local de la clínica:

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

### Citas

| Método  | Ruta                           | Acceso                               | Descripción                                                                                                                                                                                                                                                                         |
| ------- | ------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`  | `/appointments`                | Paciente, empleado o admin           | Agenda una cita (`doctorId`, `serviceId`, `startsAt`, `notes` opcional). `startsAt` debe ser uno de los horarios libres. El personal debe enviar `patientId`; un paciente siempre agenda para sí mismo. `409` si el horario está ocupado o el paciente ya tiene una cita a esa hora |
| `GET`   | `/appointments`                | Autenticado                          | Lista citas con filtros `from`, `to`, `status`, `doctorId`, `patientId` y paginación. El paciente solo ve las suyas, el médico solo su agenda, el personal todas                                                                                                                    |
| `GET`   | `/appointments/:id`            | El paciente, el médico o el personal | Devuelve una cita (`404` para cualquier otra persona)                                                                                                                                                                                                                               |
| `PATCH` | `/appointments/:id/cancel`     | El paciente, el médico o el personal | Cancela una cita (`reason` opcional). El paciente necesita al menos 2 horas de anticipación. Las citas nunca se borran                                                                                                                                                              |
| `PATCH` | `/appointments/:id/reschedule` | El paciente o el personal            | Mueve la cita a otro horario libre con el mismo médico y servicio (`{ "startsAt": "..." }`). El paciente necesita al menos 2 horas de anticipación                                                                                                                                  |
| `PATCH` | `/appointments/:id/status`     | Depende del cambio                   | `{ "status": "confirmed" \| "completed" \| "no_show" }`, según la máquina de estados de abajo                                                                                                                                                                                       |

Los cambios de estado siguen una máquina de estados:

| Desde                               | Cambios permitidos                               |
| ----------------------------------- | ------------------------------------------------ |
| `scheduled`                         | `confirmed`, `completed`, `no_show`, `cancelled` |
| `confirmed`                         | `completed`, `no_show`, `cancelled`              |
| `cancelled`, `completed`, `no_show` | ninguno (estados finales)                        |

El paciente (o el personal) confirma las citas futuras; el médico (o el personal) registra `completed` o `no_show` una vez que la cita empezó. Una cita reprogramada vuelve a `scheduled`.

Cada cita incluye `startsAt` y `endsAt` en UTC, y `date` y `time` en hora local de la clínica. Si dos peticiones agendan el mismo horario en el mismo momento, la base de datos acepta una y la otra recibe `409`.

### Recordatorios de citas

No hay endpoints: los recordatorios siguen a las citas.

- Agendar una cita programa un recordatorio **24 horas antes** (o de inmediato si falta menos, pero nunca para una cita a menos de 2 horas). Reprogramarla lo mueve, y cancelarla o registrar `completed` o `no_show` lo cancela. Todo ocurre en la misma transacción que el cambio de la cita.
- Un proceso en segundo plano revisa cada minuto los recordatorios pendientes. Justo antes de enviar, vuelve a comprobar que la cita siga activa y que el paciente haya aceptado recordatorios por algún canal; si no, el recordatorio queda `cancelled` o `skipped`.
- Los envíos fallidos se reintentan a los 1, 5, 15 y 60 minutos, y después quedan `failed`. Los recordatorios se toman con `FOR UPDATE SKIP LOCKED`, así que dos instancias de la API nunca envían el mismo.
- Los canales están detrás de una interfaz `ReminderChannel`. Hoy solo existe el correo; WhatsApp se puede agregar sin cambiar la programación ni el proceso de envío.

### Expediente clínico

| Método | Ruta                                            | Acceso                        | Descripción                                                                                                                                                                                           |
| ------ | ----------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/patients/:patientId/medical-history`          | Médico tratante o el paciente | Devuelve los antecedentes (`null` si todavía no hay)                                                                                                                                                  |
| `PUT`  | `/patients/:patientId/medical-history`          | Médico tratante               | Crea o reemplaza todos los antecedentes: `bloodType`, `allergies`, `chronicConditions`, `currentMedications`, `surgicalHistory`, `familyHistory`. Los campos ausentes o vacíos se guardan como `null` |
| `GET`  | `/patients/:patientId/notes`                    | Médico tratante o el paciente | Notas originales paginadas, de la más reciente a la más antigua, cada una con sus enmiendas                                                                                                           |
| `GET`  | `/patients/:patientId/notes/:noteId`            | Médico tratante o el paciente | Devuelve una nota con sus enmiendas                                                                                                                                                                   |
| `POST` | `/patients/:patientId/notes`                    | Médico tratante               | Crea una nota SOAP (`subjective`, `objective`, `assessment`, `plan`), opcionalmente ligada a una cita del médico con el paciente (`appointmentId`). Una nota por cita (`409`)                         |
| `POST` | `/patients/:patientId/notes/:noteId/amendments` | Autor de la nota              | Corrige una nota: la nota corregida completa más un `reason`. La original nunca cambia                                                                                                                |

- Un **médico tratante** tiene al menos una cita no cancelada con el paciente. Los administradores y empleados nunca ven contenido clínico.
- Cualquier otro usuario recibe `404`, así la API no revela qué pacientes existen. Si un paciente intenta modificar su expediente recibe `403`.
- Las notas no se editan ni se borran. Las enmiendas siempre apuntan a la nota original y solo su autor puede agregarlas.
- Cada lectura, cambio e intento denegado se guarda en la bitácora de auditoría. Un cambio y su registro de auditoría se guardan en la misma transacción.

### Archivos adjuntos

Estudios de laboratorio, imágenes y otros archivos del expediente del paciente.

| Método | Ruta                                                      | Acceso                                  | Descripción                                                                                                                                                                                                                    |
| ------ | --------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST` | `/patients/:patientId/attachments`                        | Médico tratante, el paciente o empleado | Sube un archivo como `multipart/form-data`: `file` más, opcionalmente, `category` (`lab_result`, `imaging`, `prescription`, `referral`, `other`), `description` y `clinicalNoteId` (solo médicos, una nota del mismo paciente) |
| `GET`  | `/patients/:patientId/attachments`                        | Médico tratante, el paciente o empleado | Paginado, del más reciente al más antiguo. Los empleados solo ven los archivos que ellos subieron. Los anulados se ocultan; el médico puede agregar `?includeVoided=true`                                                      |
| `GET`  | `/patients/:patientId/attachments/:attachmentId/download` | Médico tratante o el paciente           | Descarga el archivo. Los empleados reciben `403`                                                                                                                                                                               |
| `POST` | `/patients/:patientId/attachments/:attachmentId/review`   | Médico tratante                         | Marca como revisado un archivo que subió el paciente o recepción (`409` si ya lo estaba o está anulado)                                                                                                                        |
| `POST` | `/patients/:patientId/attachments/:attachmentId/void`     | Médico tratante                         | Anula un archivo equivocado con un `reason`: se oculta pero se conserva (`409` si ya estaba anulado)                                                                                                                           |

- Solo se aceptan archivos **PDF, JPEG, PNG y WebP** de hasta **10 MB** (`415` y `413` si no). El tipo se detecta por los primeros bytes del archivo, no por su nombre ni por el `Content-Type` que manda el cliente.
- Cada archivo se guarda con un nombre aleatorio, fuera de las carpetas públicas, junto con su hash SHA-256. El nombre original se limpia y solo se usa en el `Content-Disposition` de la descarga.
- Las descargas siempre se envían como archivo adjunto, con `X-Content-Type-Options: nosniff` y `Cache-Control: private, no-store`.
- Los archivos nunca se borran. Cada respuesta incluye un `status`: `pending_review`, `reviewed` o `voided`. Lo que sube el propio médico cuenta como revisado.
- Las subidas, listas, descargas, revisiones, anulaciones e intentos denegados quedan en la bitácora, sin nombres de archivo (podrían revelar información clínica).

### Bitácora de auditoría

| Método | Ruta          | Acceso | Descripción                                                                                                                                                                                           |
| ------ | ------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/audit-logs` | Admin  | Registros paginados, del más reciente al más antiguo. Filtros: `patientId`, `actorId`, `action` (`read`, `create`, `update`, `denied`), `resource` (`medical_history`, `clinical_note`), `from`, `to` |

Cada registro guarda quién (usuario y su rol en ese momento), qué (acción, recurso e id), de qué paciente, cuándo, la IP y el navegador. `details` solo contiene metadatos, como los nombres de los campos que cambiaron o los ids de las notas consultadas, nunca contenido clínico.

### Chat

Cada paciente tiene una conversación con la clínica, que atiende recepción (`employee`). Los médicos y los administradores no participan (`403`).

| Método  | Ruta                                      | Acceso                 | Descripción                                                                                                                                                                     |
| ------- | ----------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`   | `/conversations/me`                       | Paciente               | La conversación del paciente con su `unreadCount` (`null` antes del primer mensaje)                                                                                             |
| `POST`  | `/conversations/me/messages`              | Paciente               | Envía un mensaje (`{ "body": "..." }`, hasta 2000 caracteres). El primero crea la conversación; volver a escribir reabre una cerrada                                            |
| `GET`   | `/conversations`                          | Empleado               | Bandeja: la actividad más reciente primero, con el número de mensajes del paciente sin leer. Filtro `status` (`open`, `closed`) y paginación                                    |
| `GET`   | `/conversations/:conversationId`          | Empleado o el paciente | Devuelve una conversación (`404` para otros pacientes)                                                                                                                          |
| `GET`   | `/conversations/:conversationId/messages` | Empleado o el paciente | Mensajes, del más antiguo al más reciente en cada página. `?limit=` (máximo 100) y `?before=<id de mensaje>` para cargar anteriores; `nextCursor` es `null` en la última página |
| `POST`  | `/conversations/:conversationId/messages` | Empleado o el paciente | Envía un mensaje                                                                                                                                                                |
| `POST`  | `/conversations/:conversationId/read`     | Empleado o el paciente | Marca la conversación como leída hasta su último mensaje                                                                                                                        |
| `PATCH` | `/conversations/:conversationId/status`   | Empleado               | `{ "status": "open" \| "closed" }`                                                                                                                                              |

Los mensajes nunca se editan ni se borran. Enviar un mensaje también cuenta como leer todo lo anterior.

### Eventos en tiempo real (Socket.IO)

El servidor de Socket.IO usa el mismo puerto que la API. La conexión se autentica con la misma cookie de sesión que la API REST: solo pueden conectarse pacientes y empleados de recepción, y el servidor cierra la conexión cuando la sesión expira o la cuenta se desactiva o cambia de rol.

| Dirección          | Evento                 | Datos                                  | Descripción                                                                                                                                   |
| ------------------ | ---------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Cliente → servidor | `message:send`         | `{ conversationId?, body }` + callback | Envía un mensaje. Los pacientes pueden omitir `conversationId`. El callback recibe `{ ok: true, data: { message } }` o `{ ok: false, error }` |
| Cliente → servidor | `conversation:read`    | `{ conversationId }` + callback        | Marca la conversación como leída                                                                                                              |
| Cliente → servidor | `typing`               | `{ conversationId }`                   | Indicador "escribiendo…". No se guarda; solo llega a quien puede ver la conversación                                                          |
| Servidor → cliente | `message:new`          | `{ message, conversation }`            | Un mensaje nuevo, también si se envió por la API REST. `conversation` trae el `unreadCount` de quien lo recibe                                |
| Servidor → cliente | `conversation:updated` | `{ conversation }`                     | La conversación se leyó, se cerró o se reabrió                                                                                                |
| Servidor → cliente | `typing`               | `{ conversationId, side }`             | Alguien está escribiendo (`side`: `patient` o `clinic`)                                                                                       |

Los pacientes reciben los eventos de su propia conversación; cada empleado de recepción recibe los de todas. Quien envía también recibe `message:new` (para sus otras pestañas), así que los clientes evitan duplicados con el `id` del mensaje.

Las peticiones sin una sesión válida responden `401`; las de un rol sin permiso responden `403`. Una cuenta desactivada pierde el acceso de inmediato.

Los errores se devuelven como `{ "error": "mensaje" }`. Los errores de validación (`400`) incluyen además `details` con `fieldErrors` (mensajes de cada campo) y `formErrors` (errores de la petición en conjunto).

## Modelo de datos

| Tabla                   | Descripción                                                                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                 | Cuentas: email, hash de la contraseña, rol y estado `active`                                                                                                                                    |
| `doctors`               | Perfil del médico (1:1 con `users`): nombre, especialidad y cédula profesional única                                                                                                            |
| `services`              | Servicios que ofrece la clínica, con su duración en minutos                                                                                                                                     |
| `doctor_services`       | Relación muchos a muchos: qué servicios ofrece cada médico                                                                                                                                      |
| `schedule_blocks`       | Horario semanal: día (1 = lunes … 7 = domingo) e inicio/fin en minutos desde la medianoche, hora de la clínica                                                                                  |
| `patients`              | Perfil del paciente: nombre, fecha de nacimiento, teléfono (E.164), correo de contacto opcional y consentimiento para recordatorios por WhatsApp y por correo. La cuenta de usuario es opcional |
| `time_off`              | Días libres y ausencias de cada médico (fecha y hora exactas de inicio y fin)                                                                                                                   |
| `appointments`          | Citas: paciente, médico, servicio, inicio y fin (UTC), estado (`scheduled`, `confirmed`, `cancelled`, `completed`, `no_show`) y datos de cancelación. Nunca se borran                           |
| `medical_histories`     | Antecedentes de cada paciente (1:1): tipo de sangre, alergias, enfermedades crónicas, medicamentos, antecedentes quirúrgicos y familiares, y quién los actualizó por última vez                 |
| `clinical_notes`        | Notas SOAP, opcionalmente ligadas a una cita (una nota por cita). Las enmiendas son filas nuevas que apuntan a la nota original. Solo se agregan filas                                          |
| `audit_logs`            | Quién consultó o modificó qué expediente y cuándo, incluidos los intentos denegados. Solo metadatos. Solo se agregan filas                                                                      |
| `conversations`         | Una conversación por paciente con la clínica: estado (`open`, `closed`), hora del último mensaje y cuándo la leyó cada lado por última vez                                                      |
| `messages`              | Mensajes del chat: conversación, remitente, rol del remitente (`patient` o `employee`) y texto (1–2000 caracteres). Solo se agregan filas                                                       |
| `attachments`           | Archivos del expediente: nombre original, tipo, tamaño, hash SHA-256, clave de almacenamiento, categoría, quién lo subió, revisó y anuló. Nunca se borran                                       |
| `appointment_reminders` | Recordatorios por enviar (outbox): cita, hora, estado (`pending`, `sent`, `failed`, `cancelled`, `skipped`), canal, intentos y último error. Uno por cita                                       |

Además de la validación en la API, la base de datos aplica sus propias reglas con restricciones `CHECK` (duración de los servicios, días y horas válidos, rangos de días libres, tipos de sangre y reglas de las enmiendas). En `clinical_notes`, `audit_logs` y `messages` **solo se agregan filas**: un trigger rechaza cualquier `UPDATE` o `DELETE`, así que ni un bug ni una consulta manual pueden alterar una nota, la bitácora o un mensaje. En `attachments` un trigger solo permite llenar, una vez, los datos de revisión y de anulación.

### Prevención del doble agendado

La tabla `appointments` tiene una restricción `EXCLUDE` de PostgreSQL (con la extensión `btree_gist`): un médico no puede tener dos citas activas (`scheduled` o `confirmed`) cuyos rangos de tiempo se traslapen. La aplica la base de datos, así que también funciona cuando dos peticiones intentan agendar el mismo horario en el mismo momento, algo que una revisión solo en el código no puede garantizar. Las citas canceladas liberan el horario.

## Estructura del proyecto

```
.github/
└── workflows/ci.yml        # CI: tipos, lint, formato, pruebas y análisis de SonarQube
fixtures/
└── sample-lab-result.pdf  # PDF ficticio para probar subidas desde requests.http
prisma/
├── schema.prisma          # modelos de la base de datos
└── migrations/            # historial de migraciones en SQL (incluye restricciones CHECK)
public/
├── chat.html              # página para probar el chat en el navegador (no se sirve en producción)
└── chat.js                # su script, en un archivo aparte por la Content-Security-Policy
src/
├── index.ts               # arranca el servidor y maneja el apagado
├── app.ts                 # crea y configura la app de Express
├── config/
│   └── env.ts             # variables de entorno validadas con Zod
├── db/
│   ├── prisma.ts          # instancia del cliente de Prisma
│   └── seed.ts            # crea la primera cuenta de admin
├── docs/
│   ├── docs.routes.ts     # Swagger UI en /docs y /openapi.json (no se sirve en producción)
│   ├── openapi.helpers.ts # respuesta Error común y helper para cuerpos de petición
│   └── openapi.ts         # arma el documento OpenAPI 3.1 con los *.docs.ts de cada módulo
├── generated/             # cliente de Prisma generado (no se sube a git)
├── realtime/
│   ├── chat-broadcast.ts  # eventos de dominio → salas de Socket.IO (igual para REST y sockets)
│   ├── chat-handlers.ts   # message:send, conversation:read y typing, con confirmación (ack)
│   ├── rooms.ts           # salas user:<id> y staff
│   ├── socket-server.ts   # servidor de Socket.IO, autenticación con cookie, expiración de la sesión
│   └── socket.types.ts    # eventos tipados entre servidor y clientes
├── scripts/
│   └── send-test-reminder.ts  # envía un recordatorio de ejemplo (npm run mail:test)
├── shared/
│   ├── errors/            # clases de error propias
│   ├── events.ts          # EventEmitter tipado para eventos de dominio (p. ej. se guardó un mensaje)
│   ├── mail/              # interfaz MailTransport y SMTP con Nodemailer
│   ├── middlewares/       # manejadores de 404 y de errores, límites de peticiones
│   ├── schemas/           # schemas de Zod compartidos (ids, nombres, paginación, ayudas para PATCH)
│   ├── storage/           # interfaz FileStorage y su implementación en disco local
│   └── utils/             # utilidades: omitUndefined, HH:mm ↔ minutos, zona horaria de la clínica ↔ UTC, lectura de cookies
├── test/
│   ├── global-setup.ts    # crea la base de datos de pruebas y aplica las migraciones
│   ├── helpers.ts         # instancia de la app, limpieza de tablas, fábricas de datos y login
│   └── socket-helpers.ts  # servidor HTTP + Socket.IO real, login del socket y ayudas para eventos
├── types/
│   └── express.d.ts       # agrega `user` al tipo Request de Express
└── modules/
    ├── appointments/
    │   ├── appointments.constants.ts  # estados activos, reglas de reserva, STATUS_TRANSITIONS
    │   ├── appointments.controller.ts
    │   ├── appointments.docs.ts
    │   ├── appointments.errors.ts     # detecta el error de doble agendado de PostgreSQL
    │   ├── appointments.repository.ts
    │   ├── appointments.routes.ts
    │   ├── appointments.schema.ts
    │   ├── appointments.service.ts    # agendar, listas según el rol, cancelar, reprogramar, máquina de estados
    │   ├── appointments.types.ts      # respuesta con fecha y hora locales
    │   ├── availability.controller.ts
    │   ├── availability.docs.ts
    │   ├── availability.routes.ts
    │   ├── availability.service.ts    # carga horario, días libres y citas en paralelo
    │   └── availability.ts            # computeSlots: función pura, sin acceso a la base de datos
    ├── attachments/
    │   ├── attachments.constants.ts  # tipos permitidos y límite de 10 MB
    │   ├── attachments.controller.ts # cabeceras de descarga y envío por streaming
    │   ├── attachments.docs.ts
    │   ├── attachments.repository.ts # actualizaciones condicionales para revisar y anular
    │   ├── attachments.routes.ts     # montado bajo /patients/:patientId/attachments
    │   ├── attachments.schema.ts
    │   ├── attachments.service.ts    # acceso por rol, subida sin archivos huérfanos, auditoría
    │   ├── attachments.types.ts      # respuesta con status, sin la clave de almacenamiento
    │   ├── file-hash.ts              # SHA-256
    │   ├── file-name.ts              # limpia el nombre original del archivo
    │   ├── file-type.ts              # detecta PDF, JPEG, PNG y WebP por sus primeros bytes
    │   ├── upload.middleware.ts      # Multer en memoria, 413 para archivos grandes
    │   └── uploaded-file.ts          # revisa un archivo antes de guardarlo
    ├── audit/
    │   ├── audit.controller.ts
    │   ├── audit.docs.ts
    │   ├── audit.repository.ts
    │   ├── audit.routes.ts        # GET /audit-logs (admin)
    │   ├── audit.schema.ts        # filtros: paciente, usuario, acción, recurso, fechas
    │   ├── audit.service.ts       # record() (puede ir dentro de una transacción), bitácora del admin y del paciente
    │   └── audit.types.ts         # contexto de la petición y respuestas sin contenido clínico
    ├── auth/
    │   ├── auth.constants.ts
    │   ├── auth.controller.ts
    │   ├── auth.docs.ts
    │   ├── auth.middleware.ts   # authenticate (sesión) y requireRole (permisos)
    │   ├── auth.routes.ts
    │   └── auth.service.ts      # reglas de negocio (hash, JWT)
    ├── chat/
    │   ├── chat.constants.ts
    │   ├── chat.controller.ts
    │   ├── chat.docs.ts
    │   ├── chat.repository.ts   # bandeja, paginación por cursor, no leídos (una sola consulta SQL)
    │   ├── chat.routes.ts
    │   ├── chat.schema.ts       # datos de REST y de Socket.IO
    │   ├── chat.service.ts      # acceso por lado, enviar, leer, cerrar; emite eventos de dominio
    │   └── chat.types.ts
    ├── doctors/
    │   ├── doctors.controller.ts
    │   ├── doctors.docs.ts
    │   ├── doctors.repository.ts  # consultas, escrituras anidadas y transacciones
    │   ├── doctors.routes.ts
    │   ├── doctors.schema.ts
    │   ├── doctors.service.ts     # reglas de negocio (email y cédula únicos)
    │   └── doctors.types.ts       # formato de la respuesta
    ├── health/
    │   ├── health.docs.ts
    │   └── health.routes.ts
    ├── medical-records/
    │   ├── clinical-notes.controller.ts
    │   ├── clinical-notes.service.ts     # notas SOAP, una por cita, enmiendas del autor
    │   ├── medical-history.controller.ts
    │   ├── medical-history.service.ts    # PUT reemplaza los antecedentes; audita los campos que cambian
    │   ├── medical-records.access.ts     # quién puede abrir un expediente (paciente o médico tratante)
    │   ├── medical-records.constants.ts
    │   ├── medical-records.docs.ts
    │   ├── medical-records.repository.ts
    │   ├── medical-records.routes.ts     # montado bajo /patients/:patientId
    │   ├── medical-records.schema.ts
    │   └── medical-records.types.ts
    ├── patients/
    │   ├── patients.controller.ts
    │   ├── patients.docs.ts
    │   ├── patients.repository.ts   # búsqueda y paginación
    │   ├── patients.routes.ts
    │   ├── patients.schema.ts       # normalización del teléfono y fechas
    │   ├── patients.service.ts      # reglas de acceso (personal o el propio paciente)
    │   └── patients.types.ts
    ├── reminders/
    │   ├── channels/
    │   │   ├── email.channel.ts            # el ReminderChannel de correo
    │   │   └── reminder-email.template.ts  # recordatorio en español, texto y HTML
    │   ├── reminder-schedule.ts   # cuándo enviar y cuándo reintentar (funciones puras)
    │   ├── reminder.types.ts      # interfaz ReminderChannel, destinatario y contenido
    │   ├── reminders.constants.ts
    │   ├── reminders.repository.ts # programar, cancelar, tomar con FOR UPDATE SKIP LOCKED
    │   └── reminders.worker.ts    # envía cada minuto los recordatorios pendientes, con reintentos
    ├── schedules/
    │   ├── schedules.controller.ts
    │   ├── schedules.docs.ts
    │   ├── schedules.repository.ts
    │   ├── schedules.routes.ts      # montado en /doctors/:doctorId
    │   ├── schedules.schema.ts      # validación de HH:mm y de traslapes
    │   └── schedules.service.ts     # permisos: admin o el propio médico
    ├── services/
    │   ├── services.controller.ts
    │   ├── services.docs.ts
    │   ├── services.repository.ts
    │   ├── services.routes.ts
    │   └── services.schema.ts
    └── users/
        ├── users.controller.ts
        ├── users.docs.ts
        ├── users.repository.ts  # acceso a la base de datos con Prisma
        ├── users.routes.ts
        ├── users.schema.ts
        ├── users.service.ts     # reglas de negocio de la gestión de usuarios
        └── users.types.ts
```

Cada módulo agrupa su schema de validación, tipos, acceso a datos, controlador, rutas y rutas de OpenAPI (`*.docs.ts`).

## Plan de desarrollo

1. ~~Configuración base: TypeScript, linting, Express, manejo de errores y endpoint `/health`~~ ✅
2. ~~PostgreSQL con Docker y Prisma~~ ✅
3. ~~Autenticación y roles~~ ✅
4. ~~Catálogos: médicos, servicios y horarios~~ ✅
5. ~~Citas y disponibilidad~~ ✅
6. ~~Pruebas automáticas (Vitest), integración continua y cobertura de código (SonarQube)~~ ✅
7. ~~Expedientes clínicos y auditoría~~ ✅
8. ~~Chat en tiempo real~~ ✅
9. ~~Recordatorios de citas (correo)~~ ✅ — canal de WhatsApp pendiente
10. ~~Archivos adjuntos~~ ✅
11. Documentación, seguridad y despliegue — documentación con OpenAPI ✅, seguridad ✅

## Seguridad

- **Sesión:** el JWT viaja en una cookie httpOnly y `SameSite=Strict` (`Secure` en producción): los scripts de la página no pueden leerla y otros sitios no pueden enviarla.
- **Encabezados:** Helmet agrega una Content-Security-Policy (scripts solo del propio origen de la API), `X-Content-Type-Options: nosniff`, HSTS y protección contra clickjacking. Por eso la página demo carga su script desde `chat.js` en lugar de un `<script>` dentro del HTML.
- **Límites de peticiones:** al pasar el límite, la API responde `429` con los encabezados estándar `RateLimit` y `RateLimit-Policy`, que indican cuándo volver a intentar.

| Qué                                    | Límite             | Se cuenta por |
| -------------------------------------- | ------------------ | ------------- |
| Todas las peticiones (excepto /health) | 300 por minuto     | IP            |
| Inicios de sesión fallidos             | 10 cada 15 minutos | IP            |
| Registros de pacientes                 | 5 por hora         | IP            |
| Subidas de archivos                    | 30 por hora        | usuario       |

Los contadores viven en memoria; con más de una instancia de la API necesitarían un almacenamiento compartido (por ejemplo, Redis).

- **Detrás de un proxy:** pon en `TRUST_PROXY` cuántos proxies hay delante de la API (balanceador, Nginx). Si no, todos los clientes compartirían la IP del proxy en los límites y en el registro de auditoría.
- **CORS:** no está habilitado. El frontend web se sirve desde el mismo origen que la API, y a las apps móviles no les aplica CORS.

## Privacidad de datos

Los datos de salud son datos personales sensibles. El diseño sigue los principios de la NOM-004-SSA3-2012 (expediente clínico) y la NOM-024-SSA3-2012 (sistemas de información de registro electrónico para la salud): acceso restringido por rol, notas clínicas que solo se agregan y registro de auditoría. Este proyecto no está certificado para uso clínico real.
