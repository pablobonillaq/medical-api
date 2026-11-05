import { Router } from 'express'
import { clinicalNotesController } from './clinical-notes.controller.js'
import { medicalHistoryController } from './medical-history.controller.js'

// Mounted under /patients/:patientId. mergeParams gives access to :patientId.
// No requireRole here: the access policy decides and records every denied attempt.
export const medicalRecordsRouter = Router({ mergeParams: true })

medicalRecordsRouter.get('/medical-history', medicalHistoryController.get)
medicalRecordsRouter.put('/medical-history', medicalHistoryController.upsert)

// Notes can be created and amended, never edited or deleted
medicalRecordsRouter.get('/notes', clinicalNotesController.list)
medicalRecordsRouter.post('/notes', clinicalNotesController.create)
medicalRecordsRouter.get('/notes/:noteId', clinicalNotesController.getById)
medicalRecordsRouter.post('/notes/:noteId/amendments', clinicalNotesController.amend)
