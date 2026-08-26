/** Determina si debe mostrarse el chip de zona para una sesión */
export function shouldShowZone(
  sessionType: string | null | undefined,
  zoneTarget: string | null | undefined
): boolean {
  if (!zoneTarget || zoneTarget === 'N/A' || zoneTarget === '—' || zoneTarget === '') return false
  if (sessionType === 'FUERZA') return false
  return true
}
