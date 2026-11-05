import { Router } from 'express'
import { medicalHistoryController } from './medical-history.controller.js'

// Mounted under /patients/:patientId. mergeParams gives access to :patientId.
// No requireRole here: the access policy decides and records every denied attempt.
export const medicalRecordsRouter = Router({ mergeParams: true })

medicalRecordsRouter.get('/medical-history', medicalHistoryController.get)
medicalRecordsRouter.put('/medical-history', medicalHistoryController.upsert)
