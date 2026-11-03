import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js'
import { toSkipTake } from '../../shared/schemas/common.js'
import type { PublicUser } from '../users/users.types.js'
import { patientsRepository, type PatientWithUser } from './patients.repository.js'
import type {
  CreatePatientInput,
  ListPatientsQuery,
  UpdatePatientInput,
} from './patients.schema.js'
import { toPatientResponse } from './patients.types.js'

// Front desk staff can see every patient; a patient can only see their own profile
const canAccess = (patient: PatientWithUser, user: PublicUser) =>
  user.role === 'admin' || user.role === 'employee' || patient.userId === user.id

const findPatientOrThrow = async (id: string, user: PublicUser) => {
  const patient = await patientsRepository.findById(id)
  // 404 instead of 403: do not reveal that another patient's id exists
  if (!patient || !canAccess(patient, user)) throw new NotFoundError('Patient not found')
  return patient
}

export const patientsService = {
  async create(input: CreatePatientInput) {
    const patient = await patientsRepository.create(input)
    return toPatientResponse(patient)
  },

  async list({ search, page, pageSize }: ListPatientsQuery) {
    const [patients, total] = await patientsRepository.findMany({
      search,
      ...toSkipTake({ page, pageSize }),
    })
    return { patients: patients.map(toPatientResponse), page, pageSize, total }
  },

  async getById(id: string, user: PublicUser) {
    return toPatientResponse(await findPatientOrThrow(id, user))
  },

  async getMine(user: PublicUser) {
    const patient = await patientsRepository.findByUserId(user.id)
    if (!patient) throw new NotFoundError('Patient profile not found')
    return toPatientResponse(patient)
  },

  async update(id: string, input: UpdatePatientInput, user: PublicUser) {
    await findPatientOrThrow(id, user)
    if (user.role === 'admin') throw new ForbiddenError('Admins cannot edit patient data')

    const patient = await patientsRepository.update(id, input)
    return toPatientResponse(patient)
  },
}
