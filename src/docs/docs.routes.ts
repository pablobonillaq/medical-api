import { Router } from 'express'
import swaggerUi from 'swagger-ui-express'
import { buildOpenApiDocument } from './openapi.js'

// Swagger UI at /docs and the OpenAPI document it shows at /openapi.json
export const createDocsRouter = () => {
  const document = buildOpenApiDocument()
  const router = Router()

  router.get('/openapi.json', (_req, res) => {
    res.json(document)
  })
  router.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(document, { customSiteTitle: 'Medical API docs' }),
  )

  return router
}
