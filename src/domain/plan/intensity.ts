export function getSessionIntensity(type: string): 'HIGH' | 'MODERATE' | 'LOW' | 'REST' {
  switch (type) {
    case 'INTERVALOS':
    case 'TIRADA_LARGA':
    case 'SIMULACRO':
    case 'TEST':
      return 'HIGH'
    case 'TEMPO':
    case 'FARTLEK':
    case 'CICLA':
    case 'NATACION':
    case 'FUERZA':
    case 'OTRO':
      return 'MODERATE'
    case 'RODAJE_Z2':
      return 'LOW'
    case 'DESCANSO':
      return 'REST'
    default:
      return 'MODERATE'
  }
}
