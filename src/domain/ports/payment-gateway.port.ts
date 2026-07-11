/**
 * Port: IPaymentGateway
 * El dominio define esta interfaz; la infraestructura la implementa.
 * Permite cambiar de Wompi a Stripe (u otro) sin tocar el dominio.
 */
import type {
  CoachCheckoutInput,
  AthleteCheckoutInput,
  CheckoutOutput,
  WebhookEvent,
} from '../billing/billing.types'

export interface IPaymentGateway {
  createCoachCheckout(input: CoachCheckoutInput): Promise<CheckoutOutput>
  createAthleteCheckout(input: AthleteCheckoutInput): Promise<CheckoutOutput>
  /**
   * Parsea y verifica la firma de un webhook del gateway.
   * Lanza error si la firma es inválida.
   */
  parseWebhookEvent(rawBody: string, signature: string): Promise<WebhookEvent>
}
