/**
 * ITrmProvider — port para obtener la Tasa de Cambio de Referencia (TRM) USD→COP.
 * La fuente oficial es el Banco de la República (datos.gov.co).
 * La infraestructura implementa este port; el dominio solo consume el valor.
 */

export type TrmResult = {
  /** Valor del TRM: cuántos pesos colombianos vale 1 USD. Ej: 3200.50 */
  value: number
  /** Fecha de vigencia del TRM (ISO string). Ej: "2026-08-15" */
  date: string
}

export interface ITrmProvider {
  /**
   * Obtiene el TRM vigente hoy.
   * Lanza un error si no puede obtenerlo.
   */
  getCurrentTrm(): Promise<TrmResult>
}
