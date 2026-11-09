import { describe, expect, it } from 'vitest'
import type { ReminderContent } from '../reminder.types.js'
import { formatLongDate, renderReminderEmail } from './reminder-email.template.js'

const content: ReminderContent = {
  clinicName: 'Clínica Demo',
  patientFirstName: 'Luz',
  doctorName: 'Ana Garay',
  serviceName: 'Consulta general',
  date: '2026-11-10',
  time: '09:30',
}

describe('formatLongDate', () => {
  it('writes the date in Spanish without changing the day', () => {
    expect(formatLongDate('2026-11-10')).toBe('martes 10 de noviembre')
    expect(formatLongDate('2026-01-01')).toBe('jueves 1 de enero')
  })
})

describe('renderReminderEmail', () => {
  it('puts the date and time in the subject', () => {
    const email = renderReminderEmail(content)

    expect(email.subject).toBe('Recordatorio: tu cita del martes 10 de noviembre a las 09:30')
  })

  it('includes every detail in the text and the HTML versions', () => {
    const email = renderReminderEmail(content)

    for (const detail of ['Luz', 'Clínica Demo', 'Ana Garay', 'Consulta general', '09:30']) {
      expect(email.text).toContain(detail)
      expect(email.html).toContain(detail)
    }
  })

  it('escapes names so they cannot inject HTML', () => {
    const email = renderReminderEmail({ ...content, doctorName: '<script>alert(1)</script>' })

    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})
