[English](README.md) | **Español**

# Medical API

API REST para la gestión de una clínica con varios médicos: agenda de citas, expedientes clínicos, chat entre pacientes y clínica, y recordatorios de citas por WhatsApp.

> **Estado:** en desarrollo (fase 3: autenticación y roles).
> Proyecto de portafolio. Todos los datos de pruebas son **ficticios**.

## Funcionalidades

- [ ] Autenticación con JWT en cookies y control de acceso por roles
- [ ] Gestión de médicos, servicios, horarios y días no laborables
- [ ] Agenda de citas: disponibilidad, agendar, cancelar y reprogramar, sin doble agendado
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
npm run dev
```

Comprueba que todo funciona en `GET http://localhost:3000/health`.

> La base de datos se expone en el puerto **5433** para no chocar con una instalación local de PostgreSQL que use el 5432.

## Variables de entorno

| Variable            | Descripción                                   | Ejemplo                                                                 |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| `NODE_ENV`          | Entorno: `development`, `test` o `production` | `development`                                                           |
| `PORT`              | Puerto en el que corre la API                 | `3000`                                                                  |
| `POSTGRES_USER`     | Usuario de PostgreSQL que crea Docker         | `medical`                                                               |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL que crea Docker      | `medical`                                                               |
| `POSTGRES_DB`       | Base de datos que crea Docker                 | `medical_api`                                                           |
| `DATABASE_URL`      | Cadena de conexión que usan Prisma y la API   | `postgresql://medical:medical@localhost:5433/medical_api?schema=public` |
| `JWT_SECRET`        | Clave para firmar los tokens JWT              | una cadena larga y aleatoria                                            |

Los valores de `POSTGRES_*` deben coincidir con el usuario, la contraseña y la base de datos de `DATABASE_URL`.

## Scripts

| Comando               | Descripción                                                  |
| --------------------- | ------------------------------------------------------------ |
| `npm run dev`         | Inicia el servidor en modo desarrollo con recarga automática |
| `npm run typecheck`   | Verifica los tipos con TypeScript                            |
| `npm run lint`        | Revisa el código con ESLint                                  |
| `npm run format`      | Formatea el código con Prettier                              |
| `npm run check`       | Ejecuta typecheck, lint y la revisión de formato             |
| `npm run db:up`       | Levanta el contenedor de PostgreSQL                          |
| `npm run db:down`     | Detiene el contenedor de PostgreSQL (los datos se conservan) |
| `npm run db:migrate`  | Crea y aplica migraciones a partir del schema de Prisma      |
| `npm run db:generate` | Genera el cliente de Prisma                                  |
| `npm run db:studio`   | Abre Prisma Studio para ver los datos                        |

## Endpoints

| Método | Ruta             | Autenticación | Descripción                                                                                        |
| ------ | ---------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| `GET`  | `/health`        | —             | Estado de la API y de la conexión a la base de datos (`200` disponible, `503` base de datos caída) |
| `POST` | `/auth/register` | —             | Registra una cuenta de paciente (`201`; `409` si el email ya existe)                               |
| `POST` | `/auth/login`    | —             | Inicia sesión y crea la cookie httpOnly `access_token` (válida por 1 hora)                         |
| `POST` | `/auth/logout`   | —             | Borra la cookie de sesión (`204`)                                                                  |
| `GET`  | `/auth/me`       | Cookie        | Devuelve el usuario autenticado (`401` sin una sesión válida)                                      |

Los errores se devuelven como `{ "error": "mensaje" }`. Los errores de validación (`400`) incluyen además `details` con los mensajes de cada campo.

## Estructura del proyecto

```
prisma/
├── schema.prisma          # modelos de la base de datos
└── migrations/            # historial de migraciones en SQL
src/
├── index.ts               # arranca el servidor y maneja el apagado
├── app.ts                 # crea y configura la app de Express
├── config/
│   └── env.ts             # variables de entorno validadas con Zod
├── db/
│   └── prisma.ts          # instancia del cliente de Prisma
├── generated/             # cliente de Prisma generado (no se sube a git)
├── shared/
│   ├── errors/            # clases de error propias
│   └── middlewares/       # manejadores de 404 y de errores
├── types/
│   └── express.d.ts       # agrega `user` al tipo Request de Express
└── modules/
    ├── auth/
    │   ├── auth.constants.ts
    │   ├── auth.controller.ts
    │   ├── auth.middleware.ts   # authenticate: valida la cookie de sesión
    │   ├── auth.routes.ts
    │   └── auth.service.ts      # reglas de negocio (hash, JWT)
    ├── health/
    │   └── health.routes.ts
    └── users/
        ├── users.controller.ts
        ├── users.repository.ts  # acceso a la base de datos con Prisma
        ├── users.routes.ts
        ├── users.schema.ts
        └── users.types.ts
```

Cada módulo agrupa su schema de validación, tipos, acceso a datos, controlador y rutas.

## Plan de desarrollo

1. ~~Configuración base: TypeScript, linting, Express, manejo de errores y endpoint `/health`~~ ✅
2. ~~PostgreSQL con Docker y Prisma~~ ✅
3. Autenticación y roles (en curso)
4. Catálogos: médicos, servicios y horarios
5. Citas y disponibilidad
6. Expedientes clínicos y auditoría
7. Chat en tiempo real
8. Recordatorios por WhatsApp
9. Archivos adjuntos
10. Documentación, seguridad y despliegue

## Privacidad de datos

Los datos de salud son datos personales sensibles. El diseño sigue los principios de la NOM-004-SSA3-2012 (expediente clínico) y la NOM-024-SSA3-2012 (sistemas de información de registro electrónico para la salud): acceso restringido por rol, notas clínicas que solo se agregan y registro de auditoría. Este proyecto no está certificado para uso clínico real.
