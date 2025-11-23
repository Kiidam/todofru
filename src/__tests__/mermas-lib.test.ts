import { canRegisterMerma } from '@/lib/mermas'
import { computeNewStock } from '@/lib/mermas'

describe('canRegisterMerma', () => {
  test('rechaza cantidad inválida', () => {
    expect(canRegisterMerma(10, 0).ok).toBe(false)
    expect(canRegisterMerma(10, -1).ok).toBe(false)
  })
  test('rechaza sobre stock', () => {
    expect(canRegisterMerma(5, 10).ok).toBe(false)
  })
  test('acepta merma válida y calcula nuevo stock', () => {
    const r = canRegisterMerma(10, 3)
    expect(r.ok).toBe(true)
    expect(r.nuevoStock).toBe(7)
  })

  test('computeNewStock no baja de 0', () => {
    expect(computeNewStock(3, 5)).toBe(0)
    expect(computeNewStock(10, 3)).toBe(7)
  })
})
