import type { ZodOpenApiPathsObject } from 'zod-openapi'

export const healthPaths: ZodOpenApiPathsObject = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Check that the API and the database are up',
      security: [],
      responses: {
        200: { description: 'The API and the database are up' },
        503: { description: 'The database does not answer' },
      },
    },
  },
}
