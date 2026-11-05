import type { MedicalHistoryWithAuthor } from './medical-records.repository.js'

export const toMedicalHistoryResponse = ({
  updatedBy,
  updatedById: _updatedById,
  ...history
}: MedicalHistoryWithAuthor) => ({
  ...history,
  updatedBy: {
    userId: updatedBy.id,
    name: updatedBy.doctor ? `${updatedBy.doctor.firstName} ${updatedBy.doctor.lastName}` : null,
  },
})

export type MedicalHistoryResponse = ReturnType<typeof toMedicalHistoryResponse>
