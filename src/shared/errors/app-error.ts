export class AppError extends Error {
    readonly statusCode: number

    constructor(statusCode: number, message: string) {
        super(message)
        this.name = 'AppError'
        this.statusCode = statusCode
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(404, message)
    }
}