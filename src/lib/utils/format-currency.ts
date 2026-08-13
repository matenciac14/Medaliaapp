/**
 * Formats a monetary amount using Colombian locale settings.
 * Used across admin and coach finanzas views.
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}
