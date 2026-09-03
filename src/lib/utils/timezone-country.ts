/** Mapeo timezone → código ISO 3166-1 alpha-2 para priorización de alimentos LatAm */
export const TZ_TO_COUNTRY: Record<string, string> = {
  'America/Bogota':                 'CO',
  'America/Mexico_City':            'MX',
  'America/Lima':                   'PE',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Santiago':               'CL',
  'America/Caracas':                'VE',
  'America/Guayaquil':              'EC',
  'America/La_Paz':                 'BO',
  'America/Asuncion':               'PY',
  'America/Montevideo':             'UY',
  'America/Panama':                 'PA',
  'America/Costa_Rica':             'CR',
  'America/Tegucigalpa':            'HN',
  'America/Managua':                'NI',
  'America/El_Salvador':            'SV',
  'America/Guatemala':              'GT',
  'America/Havana':                 'CU',
  'America/Santo_Domingo':          'DO',
  'Europe/Madrid':                  'ES',
}

/** Retorna el código de país ISO a partir de un timezone. Default: 'CO'. */
export function countryFromTimezone(timezone: string | null | undefined): string {
  return TZ_TO_COUNTRY[timezone ?? ''] ?? 'CO'
}
