import type {
  ClinicalNoteWithAmendments,
  ClinicalNoteWithDoctor,
  MedicalHistoryWithAuthor,
} from './medical-records.repository.js'

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

const toNoteFields = ({ doctor, doctorId: _doctorId, ...note }: ClinicalNoteWithDoctor) => ({
  ...note,
  doctor: {
    id: doctor.id,
    name: `${doctor.firstName} ${doctor.lastName}`,
    specialty: doctor.specialty,
  },
})

export const toClinicalNoteResponse = ({ amendments, ...note }: ClinicalNoteWithAmendments) => ({
  ...toNoteFields(note),
  amendments: amendments.map(toNoteFields),
})

export type ClinicalNoteResponse = ReturnType<typeof toClinicalNoteResponse>
