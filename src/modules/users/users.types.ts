import type { User } from '../../generated/prisma/client.js'

export type PublicUser = Omit<User, 'passwordHash'>

export const toPublicUser = ({ passwordHash: _passwordHash, ...user }: User): PublicUser => user
