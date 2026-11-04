[English](README.md) | **Español**

# Medical API

API REST para la gestión de una clínica con varios médicos: agenda de citas, expedientes clínicos, chat entre pacientes y clínica, y recordatorios de citas por WhatsApp.

> **Estado:** en desarrollo. Fases 1–5 completadas (configuración base, base de datos, autenticación y roles, catálogos, citas); siguen las pruebas automáticas y la integración continua.
> Proyecto de portafolio. Todos los datos de pruebas son **ficticios**.

## Funcionalidades

- [x] Autenticación con JWT en cookies y control de acceso por roles
- [x] Gestión de médicos, servicios, horarios y días no laborables
- [x] Perfiles de pacientes: registro propio o por recepción, búsqueda y paginación
- [x] Agenda de citas: disponibilidad, agendar, cancelar y reprogramar, sin doble agendado
- [ ] Expediente clínico: antecedentes y notas clínicas que no se editan ni se borran
- [ ] Registro de auditoría de cada acceso a expedientes
- [ ] Chat en tiempo real entre pacientes y clínica
- [ ] Recordatorios de citas por WhatsApp
- [ ] Archivos adjuntos (estudios de laboratorio, imágenes)
- [ ] Documentación con OpenAPI / Swagger

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
- **Por agregar:** Socket.IO, WhatsApp Cloud API, Vitest

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
npm run db:up          # levanta PostgreSQL en Docker
npm run db:migrate     # aplica las migraciones
npm run db:seed        # crea la primera cuenta de admin (ADMIN_EMAIL / ADMIN_PASSWORD)
npm run dev
```

Comprueba que todo funciona en `GET http://localhost:3000/health`.

> La base de datos se expone en el puerto **5433** para no chocar con una instalación local de PostgreSQL que use el 5432.

## Variables de entorno

| Variable            | Descripción                                                                                  | Ejemplo                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `NODE_ENV`          | Entorno: `development`, `test` o `production`                                                | `development`                                                           |
| `PORT`              | Puerto en el que corre la API                                                                | `3000`                                                                  |
| `POSTGRES_USER`     | Usuario de PostgreSQL que crea Docker                                                        | `medical`                                                               |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL que crea Docker                                                     | `medical`                                                               |
| `POSTGRES_DB`       | Base de datos que crea Docker                                                                | `medical_api`                                                           |
| `DATABASE_URL`      | Cadena de conexión que usan Prisma y la API                                                  | `postgresql://medical:medical@localhost:5433/medical_api?schema=public` |
| `JWT_SECRET`        | Clave para firmar los tokens JWT                                                             | una cadena larga y aleatoria                                            |
| `CLINIC_TIMEZONE`   | Zona horaria de la clínica (IANA). Los horarios usan hora local; las citas se guardan en UTC | `America/Mexico_City`                                                   |
| `ADMIN_EMAIL`       | Email de la primera cuenta de admin que crea el seed                                         | `admin@clinica.test`                                                    |
| `ADMIN_PASSWORD`    | Contraseña de esa cuenta de admin (mínimo 12 caracteres)                                     | una contraseña larga                                                    |

Los valores de `POSTGRES_*` deben coincidir con el usuario, la contraseña y la base de datos de `DATABASE_URL`. Las variables `ADMIN_*` solo las usa `npm run db:seed`.

## Scripts

| Comando               | Descripción                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `npm run dev`         | Inicia el servidor en modo desarrollo con recarga automática     |
| `npm run typecheck`   | Verifica los tipos con TypeScript                                |
| `npm run lint`        | Revisa el código con ESLint                                      |
| `npm run format`      | Formatea el código con Prettier                                  |
| `npm run check`       | Ejecuta typecheck, lint y la revisión de formato                 |
| `npm run db:up`       | Levanta el contenedor de PostgreSQL                              |
| `npm run db:down`     | Detiene el contenedor de PostgreSQL (los datos se conservan)     |
| `npm run db:migrate`  | Crea y aplica migraciones a partir del schema de Prisma          |
| `npm run db:generate` | Genera el cliente de Prisma                                      |
| `npm run db:studio`   | Abre Prisma Studio para ver los datos                            |
| `npm run db:seed`     | Crea la primera cuenta de admin (se puede ejecutar varias veces) |

## Endpoints

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

| Método  | Ruta            | Acceso                        | Descripción                                                                                                                                                                        |
| ------- | --------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`   | `/patients/me`  | Paciente                      | Devuelve el perfil del propio paciente                                                                                                                                             |
| `GET`   | `/patients`     | Admin o empleado              | Búsqueda paginada: `?search=` (nombre en cualquier orden, o 4 o más dígitos del teléfono), `?page=` y `?pageSize=` (máximo 100). Devuelve `patients`, `page`, `pageSize` y `total` |
| `POST`  | `/patients`     | Admin o empleado              | Registra un paciente sin cuenta (por ejemplo, por teléfono)                                                                                                                        |
| `GET`   | `/patients/:id` | Admin, empleado o el paciente | Devuelve un paciente. Para otros pacientes responde `404`, así no se revelan ids                                                                                                   |
| `PATCH` | `/patients/:id` | Empleado o el paciente        | Actualiza el perfil. El admin no puede editar datos de pacientes                                                                                                                   |

El teléfono se acepta como `55 1234 5678`, `(55) 1234-5678` o `+52…` y siempre se guarda en formato E.164 (`+525512345678`), como lo exige WhatsApp. `birthDate` usa `AAAA-MM-DD`. `whatsappOptIn` guarda el consentimiento del paciente para recibir recordatorios y por defecto es `false`.

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

Las peticiones sin una sesión válida responden `401`; las de un rol sin permiso responden `403`. Una cuenta desactivada pierde el acceso de inmediato.

Los errores se devuelven como `{ "error": "mensaje" }`. Los errores de validación (`400`) incluyen además `details` con `fieldErrors` (mensajes de cada campo) y `formErrors` (errores de la petición en conjunto).

## Modelo de datos

| Tabla             | Descripción                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`           | Cuentas: email, hash de la contraseña, rol y estado `active`                                                                                                          |
| `doctors`         | Perfil del médico (1:1 con `users`): nombre, especialidad y cédula profesional única                                                                                  |
| `services`        | Servicios que ofrece la clínica, con su duración en minutos                                                                                                           |
| `doctor_services` | Relación muchos a muchos: qué servicios ofrece cada médico                                                                                                            |
| `schedule_blocks` | Horario semanal: día (1 = lunes … 7 = domingo) e inicio/fin en minutos desde la medianoche, hora de la clínica                                                        |
| `patients`        | Perfil del paciente: nombre, fecha de nacimiento, teléfono (E.164) y consentimiento de WhatsApp. La cuenta de usuario es opcional                                     |
| `time_off`        | Días libres y ausencias de cada médico (fecha y hora exactas de inicio y fin)                                                                                         |
| `appointments`    | Citas: paciente, médico, servicio, inicio y fin (UTC), estado (`scheduled`, `confirmed`, `cancelled`, `completed`, `no_show`) y datos de cancelación. Nunca se borran |

Además de la validación en la API, la base de datos aplica sus propias reglas con restricciones `CHECK` (duración de los servicios, días y horas válidos, rangos de días libres).

### Prevención del doble agendado

La tabla `appointments` tiene una restricción `EXCLUDE` de PostgreSQL (con la extensión `btree_gist`): un médico no puede tener dos citas activas (`scheduled` o `confirmed`) cuyos rangos de tiempo se traslapen. La aplica la base de datos, así que también funciona cuando dos peticiones intentan agendar el mismo horario en el mismo momento, algo que una revisión solo en el código no puede garantizar. Las citas canceladas liberan el horario.

## Estructura del proyecto

```
prisma/
├── schema.prisma          # modelos de la base de datos
└── migrations/            # historial de migraciones en SQL (incluye restricciones CHECK)
src/
├── index.ts               # arranca el servidor y maneja el apagado
├── app.ts                 # crea y configura la app de Express
├── config/
│   └── env.ts             # variables de entorno validadas con Zod
├── db/
│   ├── prisma.ts          # instancia del cliente de Prisma
│   └── seed.ts            # crea la primera cuenta de admin
├── generated/             # cliente de Prisma generado (no se sube a git)
├── shared/
│   ├── errors/            # clases de error propias
│   ├── middlewares/       # manejadores de 404 y de errores
│   ├── schemas/           # schemas de Zod compartidos (ids, nombres, paginación, ayudas para PATCH)
│   └── utils/             # utilidades: omitUndefined, HH:mm ↔ minutos, zona horaria de la clínica ↔ UTC
├── types/
│   └── express.d.ts       # agrega `user` al tipo Request de Express
└── modules/
    ├── appointments/
    │   ├── appointments.constants.ts  # estados activos, reglas de reserva, STATUS_TRANSITIONS
    │   ├── appointments.controller.ts
    │   ├── appointments.errors.ts     # detecta el error de doble agendado de PostgreSQL
    │   ├── appointments.repository.ts
    │   ├── appointments.routes.ts
    │   ├── appointments.schema.ts
    │   ├── appointments.service.ts    # agendar, listas según el rol, cancelar, reprogramar, máquina de estados
    │   ├── appointments.types.ts      # respuesta con fecha y hora locales
    │   ├── availability.controller.ts
    │   ├── availability.routes.ts
    │   ├── availability.service.ts    # carga horario, días libres y citas en paralelo
    │   └── availability.ts            # computeSlots: función pura, sin acceso a la base de datos
    ├── auth/
    │   ├── auth.constants.ts
    │   ├── auth.controller.ts
    │   ├── auth.middleware.ts   # authenticate (sesión) y requireRole (permisos)
    │   ├── auth.routes.ts
    │   └── auth.service.ts      # reglas de negocio (hash, JWT)
    ├── doctors/
    │   ├── doctors.controller.ts
    │   ├── doctors.repository.ts  # consultas, escrituras anidadas y transacciones
    │   ├── doctors.routes.ts
    │   ├── doctors.schema.ts
    │   ├── doctors.service.ts     # reglas de negocio (email y cédula únicos)
    │   └── doctors.types.ts       # formato de la respuesta
    ├── health/
    │   └── health.routes.ts
    ├── patients/
    │   ├── patients.controller.ts
    │   ├── patients.repository.ts   # búsqueda y paginación
    │   ├── patients.routes.ts
    │   ├── patients.schema.ts       # normalización del teléfono y fechas
    │   ├── patients.service.ts      # reglas de acceso (personal o el propio paciente)
    │   └── patients.types.ts
    ├── schedules/
    │   ├── schedules.controller.ts
    │   ├── schedules.repository.ts
    │   ├── schedules.routes.ts      # montado en /doctors/:doctorId
    │   ├── schedules.schema.ts      # validación de HH:mm y de traslapes
    │   └── schedules.service.ts     # permisos: admin o el propio médico
    ├── services/
    │   ├── services.controller.ts
    │   ├── services.repository.ts
    │   ├── services.routes.ts
    │   └── services.schema.ts
    └── users/
        ├── users.controller.ts
        ├── users.repository.ts  # acceso a la base de datos con Prisma
        ├── users.routes.ts
        ├── users.schema.ts
        ├── users.service.ts     # reglas de negocio de la gestión de usuarios
        └── users.types.ts
```

Cada módulo agrupa su schema de validación, tipos, acceso a datos, controlador y rutas.

## Plan de desarrollo

1. ~~Configuración base: TypeScript, linting, Express, manejo de errores y endpoint `/health`~~ ✅
2. ~~PostgreSQL con Docker y Prisma~~ ✅
3. ~~Autenticación y roles~~ ✅
4. ~~Catálogos: médicos, servicios y horarios~~ ✅
5. ~~Citas y disponibilidad~~ ✅
6. Pruebas automáticas (Vitest), integración continua y cobertura de código (SonarQube) (en curso)
7. Expedientes clínicos y auditoría
8. Chat en tiempo real
9. Recordatorios por WhatsApp
10. Archivos adjuntos
11. Documentación, seguridad y despliegue

## Privacidad de datos

Los datos de salud son datos personales sensibles. El diseño sigue los principios de la NOM-004-SSA3-2012 (expediente clínico) y la NOM-024-SSA3-2012 (sistemas de información de registro electrónico para la salud): acceso restringido por rol, notas clínicas que solo se agregan y registro de auditoría. Este proyecto no está certificado para uso clínico real.
