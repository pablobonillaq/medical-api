// Every socket of a user (one per open tab or device)
export const userRoom = (userId: string) => `user:${userId}`

// Every front desk socket: they all share the clinic's inbox
export const STAFF_ROOM = 'staff'
