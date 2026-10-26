[English](README.md) | **Español**

# Medical API

API REST para la gestión de una clínica con varios médicos: agenda de citas, expedientes clínicos, chat entre pacientes y clínica, y recordatorios de citas por WhatsApp.

> **Estado:** en desarrollo (fase 1: configuración base y módulo de usuarios).
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
- **Validación:** Zod
- **Calidad de código:** ESLint (typescript-eslint) y Prettier
- **Por agregar:** Express, PostgreSQL, Socket.IO, WhatsApp Cloud API, Vitest, Docker

## Requisitos

- Node.js 22 o superior
- npm

## Instalación

```bash
git clone <url-del-repositorio>
cd medical-api
npm install
cp .env.example .env   # y completa los valores
npm run dev
```

## Variables de entorno

| Variable       | Descripción                           |
| -------------- | ------------------------------------- |
| `PORT`         | Puerto en el que corre la API         |
| `DATABASE_URL` | Cadena de conexión a la base de datos |
| `JWT_SECRET`   | Clave para firmar los tokens JWT      |

## Scripts

| Comando             | Descripción                                                  |
| ------------------- | ------------------------------------------------------------ |
| `npm run dev`       | Inicia el servidor en modo desarrollo con recarga automática |
| `npm run typecheck` | Verifica los tipos con TypeScript                            |
| `npm run lint`      | Revisa el código con ESLint                                  |
| `npm run format`    | Formatea el código con Prettier                              |
| `npm run check`     | Ejecuta typecheck, lint y la revisión de formato             |

## Estructura del proyecto

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

Cada módulo agrupa su schema de validación, tipos, modelo, controlador y rutas.

## Plan de desarrollo

1. Configuración base: TypeScript, linting, Express, manejo de errores y endpoint `/health`
2. Autenticación y roles
3. Catálogos: médicos, servicios y horarios
4. Citas y disponibilidad
5. Expedientes clínicos y auditoría
6. Chat en tiempo real
7. Recordatorios por WhatsApp
8. Archivos adjuntos
9. Documentación, seguridad y despliegue

## Privacidad de datos

Los datos de salud son datos personales sensibles. El diseño sigue los principios de la NOM-004-SSA3-2012 (expediente clínico) y la NOM-024-SSA3-2012 (sistemas de información de registro electrónico para la salud): acceso restringido por rol, notas clínicas que solo se agregan y registro de auditoría. Este proyecto no está certificado para uso clínico real.
