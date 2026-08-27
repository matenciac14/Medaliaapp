/**
 * MedaliqLogo — logo completo (símbolo + wordmark)
 *
 * variant="dark"  → símbolo sobre fondo oscuro (sidebar navy): chevrons naranja + blanco, texto blanco
 * variant="light" → símbolo con caja navy sobre fondo claro (headers, landing): texto navy
 */

interface MedaliqLogoProps {
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
}

export function MedaliqLogo({
  variant = 'light',
  size = 'md',
  showWordmark = true,
}: MedaliqLogoProps) {
  const iconSize = size === 'sm' ? 24 : size === 'md' ? 28 : 36
  const textClass =
    size === 'sm'
      ? 'text-base font-extrabold tracking-tight'
      : size === 'md'
        ? 'text-xl font-extrabold tracking-tight'
        : 'text-2xl font-extrabold tracking-tight'

  if (variant === 'dark') {
    // Sobre fondo navy: caja con borde sutil blanco/10 + chevrons naranja + blanco, texto blanco
    return (
      <span className="flex items-center gap-2">
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect width="120" height="120" rx="24" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
          <polygon points="60,26 92,58 74,58 60,44 46,58 28,58" fill="#ea580c" />
          <polygon points="60,58 92,90 74,90 60,76 46,90 28,90" fill="#f7f6f4" />
        </svg>
        {showWordmark && (
          <span className={`${textClass} text-white`}>
            Medal<span className="text-[#ea580c]">IQ</span>
          </span>
        )}
      </span>
    )
  }

  // variant="light": caja navy redondeada con chevrons naranja + blanco, texto navy
  return (
    <span className="flex items-center gap-2.5">
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="120" height="120" rx="24" fill="#1e3a5f" />
        <polygon points="60,26 92,58 74,58 60,44 46,58 28,58" fill="#ea580c" />
        <polygon points="60,58 92,90 74,90 60,76 46,90 28,90" fill="#f7f6f4" />
      </svg>
      {showWordmark && (
        <span className={`${textClass} text-[#1e3a5f]`}>
          Medal<span className="text-[#c2410c]">IQ</span>
        </span>
      )}
    </span>
  )
}
