/**
 * Factory: devuelve la implementación del gateway según la variable PAYMENT_GATEWAY.
 * Cambiar el env var es suficiente para cambiar de gateway — sin tocar el dominio.
 */
import type { IPaymentGateway } from '@/domain/ports/payment_gateway'
import { StubPaymentGateway } from './stub_payment_gateway'
import { WompiPaymentGateway } from './wompi_payment_gateway'

export function getPaymentGateway(): IPaymentGateway {
  const provider = process.env.PAYMENT_GATEWAY ?? 'stub'

  switch (provider) {
    case 'wompi':  return new WompiPaymentGateway()
    // case 'stripe': return new StripePaymentGateway()  // futuro
    default:
      return new StubPaymentGateway()
  }
}
