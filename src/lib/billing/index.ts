/**
 * Billing — stub para integración futura de pagos.
 *
 * La decisión de proveedor depende de la región del cliente:
 *   - LatAm (CO, MX, PE, AR): Wompi, MercadoPago, Kushki
 *   - Global / USD: Stripe
 *
 * Hasta que se implemente, todas las funciones son no-ops que devuelven
 * resultados simulados. Esto permite que el resto del código los llame
 * sin romperse.
 *
 * Para implementar: reemplazar el cuerpo de cada función con la lógica
 * real del proveedor elegido. La firma no debería cambiar.
 */

export type BillingPlan = 'PRO_MONTHLY' | 'PRO_QUARTERLY' | 'PRO_YEARLY'
export type BillingProvider = 'stripe' | 'wompi' | 'mercadopago' | 'mock'

export type CheckoutSession = {
  id: string
  url: string          // URL de redirección al checkout del proveedor
  provider: BillingProvider
}

export type Subscription = {
  id: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  plan: BillingPlan
  currentPeriodEnd: Date
  provider: BillingProvider
}

export type WebhookEvent = {
  type: 'subscription.activated' | 'subscription.canceled' | 'payment.failed'
  subscriptionId: string
  userId: string
  plan?: BillingPlan
}

/**
 * Crea una sesión de checkout para que el usuario complete el pago.
 * Redirigir al usuario a `session.url` tras obtener el resultado.
 */
export async function createCheckoutSession(params: {
  userId: string
  plan: BillingPlan
  returnUrl: string
}): Promise<CheckoutSession> {
  // TODO: implementar con Stripe o Wompi según región del usuario
  console.warn('[billing] mock — createCheckoutSession llamado', params)
  return {
    id: `mock_${Date.now()}`,
    url: params.returnUrl,
    provider: 'mock',
  }
}

/**
 * Cancela la suscripción activa del usuario al final del período actual.
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  // TODO: implementar
  console.warn('[billing] mock — cancelSubscription llamado', subscriptionId)
}

/**
 * Consulta el estado actual de la suscripción desde el proveedor.
 */
export async function getSubscription(subscriptionId: string): Promise<Subscription | null> {
  // TODO: implementar
  console.warn('[billing] mock — getSubscription llamado', subscriptionId)
  return null
}

/**
 * Parsea y valida un webhook entrante del proveedor de pagos.
 * Llamar desde /api/billing/webhook.
 */
export function parseWebhookEvent(
  payload: string,
  signature: string,
): WebhookEvent | null {
  // TODO: validar firma (Stripe: stripe.webhooks.constructEvent, Wompi: HMAC-SHA256)
  console.warn('[billing] mock — parseWebhookEvent llamado')
  return null
}
