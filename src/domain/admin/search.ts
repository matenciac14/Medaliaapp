/**
 * Lógica pura para búsqueda global en el panel admin.
 * Sin dependencias de Prisma, Next.js ni fetch.
 */

export type SearchUser = {
  id: string
  name: string | null
  email: string
  role: string
}

/**
 * Filtra usuarios cuyo nombre o email contiene `query` (case-insensitive).
 * Devuelve array vacío si query está vacío o es solo espacios.
 */
export function filterUsers(users: SearchUser[], query: string): SearchUser[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return users.filter(
    (u) =>
      u.email.toLowerCase().includes(q) ||
      (u.name?.toLowerCase().includes(q) ?? false),
  )
}

/**
 * Ordena los resultados: coincidencia exacta de nombre > empieza con query > contiene.
 * Dentro del mismo grupo, ordena alfabéticamente por nombre.
 */
export function rankResults(users: SearchUser[], query: string): SearchUser[] {
  const q = query.trim().toLowerCase()
  if (!q) return users

  function score(u: SearchUser): number {
    const name  = u.name?.toLowerCase() ?? ''
    const email = u.email.toLowerCase()
    if (name === q || email === q)           return 0
    if (name.startsWith(q) || email.startsWith(q)) return 1
    return 2
  }

  return [...users].sort((a, b) => {
    const diff = score(a) - score(b)
    if (diff !== 0) return diff
    return (a.name ?? a.email).localeCompare(b.name ?? b.email)
  })
}

/**
 * Filtra y rankea en un solo paso, limitando al máximo de resultados.
 */
export function searchUsers(
  users: SearchUser[],
  query: string,
  maxResults = 10,
): SearchUser[] {
  return rankResults(filterUsers(users, query), query).slice(0, maxResults)
}
