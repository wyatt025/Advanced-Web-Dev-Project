const displayFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Helsinki',
})

const localFormatter = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Helsinki',
})

export function formatScreeningDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : displayFormatter.format(date)
}

export function screeningDateParts(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: String(value), time: 'Unavailable' }
  const parts = Object.fromEntries(displayFormatter.formatToParts(date).map(({ type, value: part }) => [type, part]))
  return { date: `${parts.day}/${parts.month}/${parts.year}`, time: `${parts.hour}:${parts.minute}` }
}

export function screeningLocalInput(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = Object.fromEntries(localFormatter.formatToParts(date).map(({ type, value: part }) => [type, part]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
