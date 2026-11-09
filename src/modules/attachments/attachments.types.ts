import type { AttachmentWithUploader } from './attachments.repository.js'

const statusOf = ({ voidedAt, reviewedAt }: AttachmentWithUploader) => {
  if (voidedAt) return 'voided' as const
  return reviewedAt ? ('reviewed' as const) : ('pending_review' as const)
}

// storageKey stays internal: files are only reachable through the download endpoint
export const toAttachmentResponse = (attachment: AttachmentWithUploader) => {
  const { storageKey: _storageKey, uploadedBy, uploadedById: _uploadedById, ...rest } = attachment
  return {
    ...rest,
    status: statusOf(attachment),
    uploadedBy: {
      id: uploadedBy.id,
      role: uploadedBy.role,
      name: uploadedBy.doctor
        ? `${uploadedBy.doctor.firstName} ${uploadedBy.doctor.lastName}`
        : null,
    },
  }
}

export type AttachmentResponse = ReturnType<typeof toAttachmentResponse>
