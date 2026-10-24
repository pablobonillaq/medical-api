import type { Role } from "./users.schema.js"

export interface User {
    id: string
    email: string
    passwordHash: string
    role: Role
    active: boolean
    createdAt: Date
}

export type PublicUser = Omit<User, 'passwordHash'>  // lo que sí se devuelve al cliente