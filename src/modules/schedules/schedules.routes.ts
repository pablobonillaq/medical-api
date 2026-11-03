import { Router } from 'express'
import { schedulesController } from './schedules.controller.js'

// Mounted under /doctors/:doctorId. mergeParams gives access to :doctorId.
// Permissions are checked in the service: the admin or the doctor themselves.
export const schedulesRouter = Router({ mergeParams: true })

schedulesRouter.get('/schedule', schedulesController.getSchedule)
schedulesRouter.put('/schedule', schedulesController.replaceSchedule)
schedulesRouter.get('/time-off', schedulesController.listTimeOff)
schedulesRouter.post('/time-off', schedulesController.createTimeOff)
schedulesRouter.delete('/time-off/:timeOffId', schedulesController.deleteTimeOff)
