/**
 * Factory: devuelve la implementación del gateway según la variable PAYMENT_GATEWAY.
 * Cambiar el env var es suficiente para cambiar de gateway — sin tocar el dominio.
 */
import type { IPaymentGateway } from '@/domain/ports/payment-gateway.port'
import { StubPaymentGateway } from './stub-payment-gateway'

export function getPaymentGateway(): IPaymentGateway {
  const provider = process.env.PAYMENT_GATEWAY ?? 'stub'

  switch (provider) {
    // case 'wompi':  return new WompiPaymentGateway()   // implementar al elegir Wompi
    // case 'stripe': return new StripePaymentGateway()  // implementar al elegir Stripe
    default:
      return new StubPaymentGateway()
  }
}
