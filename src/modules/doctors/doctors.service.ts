import bcrypt from 'bcrypt'
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors/app-error.js'
import { SALT_ROUNDS } from '../auth/auth.constants.js'
import { servicesRepository } from '../services/services.repository.js'
import type { Role } from '../users/users.schema.js'
import { usersRepository } from '../users/users.repository.js'
import { doctorsRepository } from './doctors.repository.js'
import type { CreateDoctorInput, ListDoctorsQuery, UpdateDoctorInput } from './doctors.schema.js'
import { toDoctorResponse } from './doctors.types.js'

export const doctorsService = {
  async create({ email, password, ...profile }: CreateDoctorInput) {
    if (await usersRepository.findByEmail(email)) {
      throw new ConflictError('Email is already registered')
    }
    if (await doctorsRepository.findByLicenseNumber(profile.licenseNumber)) {
      throw new ConflictError('License number is already registered')
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const doctor = await doctorsRepository.createWithUser({ email, passwordHash, ...profile })
    return toDoctorResponse(doctor)
  },

  async list(query: ListDoctorsQuery, viewerRole: Role) {
    const doctors = await doctorsRepository.findMany({
      serviceId: query.serviceId,
      includeInactive: query.includeInactive === true && viewerRole === 'admin',
    })
    return doctors.map(toDoctorResponse)
  },

  async getById(id: string, viewerRole: Role) {
    const doctor = await doctorsRepository.findById(id)
    if (!doctor || (!doctor.user.active && viewerRole !== 'admin')) {
      throw new NotFoundError('Doctor not found')
    }
    return toDoctorResponse(doctor)
  },

  async update(id: string, input: UpdateDoctorInput) {
    const doctor = await doctorsRepository.update(id, input)
    return toDoctorResponse(doctor)
  },

  async setServices(id: string, serviceIds: string[]) {
    if (!(await doctorsRepository.findById(id))) throw new NotFoundError('Doctor not found')

    const activeServices = await servicesRepository.findActiveByIds(serviceIds)
    if (activeServices.length !== serviceIds.length) {
      throw new BadRequestError('Some services do not exist or are inactive')
    }

    await doctorsRepository.replaceServices(id, serviceIds)
    return doctorsService.getById(id, 'admin')
  },
}
