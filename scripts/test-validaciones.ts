import { ValidacionesService } from '../src/services/validaciones'

function probarDNI(casos: string[]) {
  console.log('\n🆔 Pruebas DNI')
  for (const c of casos) {
    const r = ValidacionesService.validarDNI(c)
    console.log(`${c} -> ${r.valido ? '✅ válido' : '❌ inválido'}${r.mensaje ? ' (' + r.mensaje + ')' : ''}`)
  }
}

function probarRUC(casos: string[]) {
  console.log('\n🏢 Pruebas RUC')
  for (const c of casos) {
    const r = ValidacionesService.validarRUC(c)
    console.log(`${c} -> ${r.valido ? '✅ válido' : '❌ inválido'}${r.mensaje ? ' (' + r.mensaje + ')' : ''}`)
  }
}

probarDNI(['87654321', '12345678', '00000000', '11111111', '12-345.678', 'abc12345'])
probarRUC(['20123456789', '10456789012', '00000000000', '11111111111', '20-123-456-789', 'abc2012345'])