import { escapeHtml } from '../../../shared/utils/html.js'
import type { ReminderContent } from '../reminder.types.js'

// "2026-11-10" → "martes 10 de noviembre". The date is already local, so it is read as UTC.
export const formatLongDate = (date: string) =>
  new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
    .format(new Date(`${date}T00:00:00Z`))
    .replace(',', '')

// Plain text and HTML versions: some email apps only show the text one
export const renderReminderEmail = (content: ReminderContent) => {
  const longDate = formatLongDate(content.date)
  const subject = `Recordatorio: tu cita del ${longDate} a las ${content.time}`

  const text = [
    `Hola, ${content.patientFirstName}:`,
    '',
    `Te recordamos tu cita en ${content.clinicName}:`,
    '',
    `- Fecha: ${longDate}`,
    `- Hora: ${content.time}`,
    `- Médico: ${content.doctorName}`,
    `- Servicio: ${content.serviceName}`,
    '',
    'Si no puedes asistir, cancela o reprograma tu cita con anticipación.',
    '',
    'Este es un mensaje automático, no respondas a este correo.',
  ].join('\n')

  const e = escapeHtml
  const html = `<!doctype html>
<html lang="es">
  <body style="font-family: Arial, sans-serif; color: #1d2733; line-height: 1.5">
    <p>Hola, ${e(content.patientFirstName)}:</p>
    <p>Te recordamos tu cita en <strong>${e(content.clinicName)}</strong>:</p>
    <ul>
      <li><strong>Fecha:</strong> ${e(longDate)}</li>
      <li><strong>Hora:</strong> ${e(content.time)}</li>
      <li><strong>Médico:</strong> ${e(content.doctorName)}</li>
      <li><strong>Servicio:</strong> ${e(content.serviceName)}</li>
    </ul>
    <p>Si no puedes asistir, cancela o reprograma tu cita con anticipación.</p>
    <p style="color: #6b7785; font-size: 12px">
      Este es un mensaje automático, no respondas a este correo.
    </p>
  </body>
</html>`

  return { subject, text, html }
}
