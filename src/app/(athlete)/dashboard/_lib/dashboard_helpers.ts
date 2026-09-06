export const PHASE_COLORS: Record<string, string> = {
  BASE: 'bg-blue-100 text-blue-800',
  DESARROLLO: 'bg-yellow-100 text-yellow-800',
  ESPECIFICO: 'bg-orange-100 text-orange-800',
  AFINAMIENTO: 'bg-green-100 text-green-800',
}

export function getGreeting(tz: string): string {
  try {
    const h = parseInt(
      new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(new Date()),
      10,
    )
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  } catch {
    const h = new Date().getUTCHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }
}

export function formatDate(): string {
  const s = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
