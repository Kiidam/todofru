type MermaErrorCode = 'INVALID_CANTIDAD' | 'INSUFFICIENT_STOCK' | 'BELOW_MIN_STOCK'

interface MermaValidationResult {
  ok: boolean
  error?: string
  code?: MermaErrorCode
  nuevoStock?: number
  warning?: string
}

function toNumber(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(v) ? v : 0
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function canRegisterMerma(stockActual: number, cantidad: number, stockMinimo?: number): MermaValidationResult {
  const s = toNumber(stockActual)
  const c = toNumber(cantidad)
  if (!Number.isFinite(c) || c <= 0) return { ok: false, error: 'Cantidad inválida', code: 'INVALID_CANTIDAD' }
  if (c > s) return { ok: false, error: 'Stock insuficiente', code: 'INSUFFICIENT_STOCK' }
  const nuevoStock = round2(Math.max(0, s - c))
  const m = stockMinimo !== undefined ? toNumber(stockMinimo) : undefined
  if (m !== undefined && nuevoStock < m) {
    return { ok: true, nuevoStock, warning: 'El nuevo stock queda por debajo del mínimo', code: 'BELOW_MIN_STOCK' }
  }
  return { ok: true, nuevoStock }
}

export function computeNewStock(stockActual: number, cantidad: number) {
  const s = toNumber(stockActual)
  const c = toNumber(cantidad)
  const ns = s - (Number.isFinite(c) ? c : 0)
  return round2(Math.max(0, ns))
}
