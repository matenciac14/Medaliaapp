/**
 * Construye la URL del GIF para un ejercicio.
 *
 * Prioridad:
 *  1. gifStoredUrl — S3/Blob propio (EX-13, cuando esté listo)
 *  2. /api/athlete/gym/gif/[id] — proxy server-side que añade X-WorkoutX-Key
 *  3. null — ejercicio sin GIF (custom del coach)
 *
 * El proxy es necesario porque WorkoutX exige el header X-WorkoutX-Key
 * y los componentes <Image>/<img> no pueden inyectar headers custom.
 */
export function resolveExerciseGifUrl(
  exerciseId: string,
  gifStoredUrl: string | null | undefined,
  gifUrl: string | null | undefined,
): string | null {
  if (gifStoredUrl) return gifStoredUrl
  if (gifUrl) return `${process.env.NEXTAUTH_URL}/api/athlete/gym/gif/${exerciseId}`
  return null
}
