import { ValidacionesService } from '@/services/validaciones'

function buildValidRuc(prefix: string): string {
  const base = prefix.padEnd(10, '0').slice(0, 10)
  const digits = base.split('').map(n => parseInt(n, 10))
  const factors = [5,4,3,2,7,6,5,4,3,2]
  let sum = 0
  for (let i = 0; i < 10; i++) sum += digits[i] * factors[i]
  const rest = sum % 11
  const dv = rest < 2 ? rest : 11 - rest
  return base + String(dv)
}

describe('ValidacionesService', () => {
  test('DNI válido e inválido', () => {
    expect(ValidacionesService.validarDNI('12345678').valido).toBe(true)
    expect(ValidacionesService.validarDNI('00000000').valido).toBe(false)
    expect(ValidacionesService.validarDNI('1234567').valido).toBe(false)
  })

  test('RUC válido e inválido (check dígito verificador)', () => {
    const rucValido = buildValidRuc('2010007097') // genera un RUC con DV según algoritmo
    expect(ValidacionesService.validarRUC(rucValido).valido).toBe(true)
    expect(ValidacionesService.validarRUC('11111111111').valido).toBe(false)
    expect(ValidacionesService.validarRUC('20100070971').valido).toBe(false)
  })
})

